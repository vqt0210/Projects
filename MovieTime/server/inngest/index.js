import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/resend.js";
import { bookingConfirmationEmail, showReminderEmail, newShowNotificationEmail } from "../emails/template.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-time" });

// Inngest Function to save user data to a database
const syncUserCreation = inngest.createFunction(
  {id: 'sync-user-from-clerk'},
  {event: 'clerk/user.created'},
  async ({ event })=> {
    const {id, first_name, last_name, email_addresses, image_url} = event.data
    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: first_name + ' ' + last_name,
      image: image_url
    }
    await User.create(userData)
  }
)


// Inngest Function to delete user from database
const syncUserDeletion = inngest.createFunction(
  {id: 'delete-user-with-clerk'},
  {event: 'clerk/user.deleted'},
  async ({ event })=> {
    const {id} = event.data
    await User.findByIdAndDelete(id)
   
  }
)

// Inngest Function to update user data in database

const syncUserUpdation = inngest.createFunction(
  {id: 'update-user-from-clerk'},
  {event: 'clerk/user.updated'},
  async ({ event })=> {
    const { id, first_name, last_name, email_addresses, image_url} =event.data
    const userData = {
      _id: id,
      email: email_addresses?.[0]?.email_address || '',
      name: first_name + ' ' + last_name,
      image: image_url
    }
    await User.findByIdAndUpdate(id, userData)
   
  }
)

// Inngest Function to cancel booking and release seats of show after 10 minutes of booking created if payment is not made

const releaseSeatsAndDeleteBooking = inngest.createFunction(
  { id: "release-seats-delete-booking" },
  { event: "app/checkpayment" },
  async ({ event, step }) => {
    if (typeof step?.log !== "function") step.log = async () => {};
    const bookingId = event.data.bookingId;

    // 1) Lấy booking để xác định đúng thời điểm chờ (ưu tiên expiresAt nếu có)
    const b0 = await Booking.findById(bookingId).lean();
    if (!b0) {
      await step.log(`[RELEASE] booking not found: ${bookingId}`);
      return;
    }

    // Nếu đã thanh toán/confirm thì thoát sớm
    if (b0.isPaid === true || b0.status === "CONFIRMED" || b0.status === "PAID") {
      await step.log(`[RELEASE] already paid/confirmed, skip: ${bookingId}`);
      return;
    }

    const wakeAt =
      b0.expiresAt instanceof Date
        ? b0.expiresAt
        : new Date(new Date(b0.createdAt || Date.now()).getTime() + 10 * 60 * 1000);

    await step.sleepUntil("wait-until-expire", wakeAt);

    // 2) IDP Guard: chỉ "expire" nếu vẫn còn pending và đã quá hạn
    //    Đổi trạng thái trước, rồi mới động vào ghế.
    const now = new Date();
    const expiredBooking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      status: { $in: ["PENDING_PAYMENT", null] },   // chỉ xử lý khi còn pending
      $and: [
        { $or: [ { isPaid: { $ne: true } }, { status: { $nin: ["PAID", "CONFIRMED"] } } ] },  // chưa paid
        { $or: [ { expiresAt: { $lte: now } }, { expiresAt: { $exists: false } } ] }          // đã quá hạn
      ],
    },
    { $set: { status: "EXPIRED", expiredAt: now } },
    { new: true }
    ).lean();

    if (!expiredBooking) {
      await step.log(`[RELEASE] NO-OP (paid/confirmed/not-expired): ${bookingId}`);
      return;
    }

    // 3) Thao tác trả ghế + ghi trạng thái trong cùng 1 transaction
    await step.run("release-seats-transaction", async () => {
      const session = await Booking.startSession();
      try {
        await session.withTransaction(async () => {
          const show = await Show.findById(expiredBooking.show).session(session);
          if (!show) {
            await step.log(`[RELEASE] show not found for booking ${bookingId}`);
            return;
          }

          // occupiedSeats đang là object map: { "A1": true, ... }
          for (const seat of expiredBooking.bookedSeats || []) {
            if (show.occupiedSeats && Object.prototype.hasOwnProperty.call(show.occupiedSeats, seat)) {
              delete show.occupiedSeats[seat];
            }
          }
          show.markModified("occupiedSeats");
          await show.save({ session });

          // KHÔNG xoá booking để giữ log; chỉ giữ trạng thái EXPIRED
          // await Booking.deleteOne({ _id: expiredBooking._id }).session(session);
        });
      } finally {
        session.endSession();
      }
    });

    await step.log(`[RELEASE] Done, seats freed for booking ${bookingId}`);
  }
);


// Inngest Function to send email when user books a show
const sendBookingConfirmationEmail = inngest.createFunction(
  { id:"send-booking-confirmation-email" }, { event:"app/show.booked" },
  async ({ event, step }) => {
    const booking = await Booking.findById(event.data.bookingId).populate({ path:'show', populate:{ path:'movie' } }).populate('user');
    if(!booking?.user?.email) return;
    await sendEmail({
      to: booking.user.email,
      subject:`Booking Confirmation: "${booking.show.movie.title}"`,
      body: bookingConfirmationEmail({
        user: booking.user,
        movieTitle: booking.show.movie.title,
        showDateTime: booking.show.showDateTime,
        bookedSeats: booking.bookedSeats,
        bookingLink: `https://teasonmike.io.vn/my-bookings`,
        supportLink: `https://teasonmike.io.vn`
      })
    });
  }
);
// Inngest Function to send reminders
const sendShowReminders = inngest.createFunction(
  {id:"send-show-reminders"}, { cron:"0 */8 * * *" },
  async ({ step }) => {
    const now = new Date(), in8h = new Date(now.getTime()+8*60*60*1000), windowStart = new Date(in8h.getTime()-10*60*1000);
    const shows = await Show.find({ showTime:{ $gte: windowStart, $lte: in8h } }).populate('movie');
    for(const show of shows){
      const userIds = [...new Set(Object.values(show.occupiedSeats||{}))];
      const users = await User.find({_id:{$in:userIds}});
      for(const user of users){
        await sendEmail({
          to: user.email,
          subject:`Reminder: Your movie "${show.movie.title}" starts soon!`,
          body: showReminderEmail({ 
            user, 
            movieTitle: show.movie.title, 
            showTime: show.showTime,
            bookingLink: `https://teasonmike.io.vn/my-bookings` 
          })
        });
      }
    }
  }
);

// Inngest Function to send notifications when a new show is added
const sendNewShowNotifications = inngest.createFunction(
  {id:"send-new-show-notification"}, { event:"app/show.added" },
  async ({ event, step }) => {
    const { movieId, movieTitle } = event.data;
    const users = await User.find({});
    const sentEmails = new Set();
    for(const user of users){
       if (!user.email || sentEmails.has(user.email)) continue;
      await sendEmail({
        to: user.email,
        subject:`🎬 New Show Added: ${movieTitle}`,
        body: newShowNotificationEmail({
          user,
          movieTitle,
          showLink:`https://teasonmike.io.vn/movies/${movieId}`
        })
      });
      sentEmails.add(user.email);
    }
    await step.log(`Sent notifications for movie ${movieTitle} to ${sentEmails.size} users`);
  }
);

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
  sendShowReminders,
  sendNewShowNotifications
];