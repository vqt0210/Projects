import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/resend.js";
import { bookingConfirmationEmail, showReminderEmail, newShowNotificationEmail } from "../email/template.js";

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
  { event: "app/show.booked" },
  async ({ event, step }) => {
    const bookingId = event.data.bookingId;
    const booking = await Booking.findById(bookingId).lean();
    if (!booking) return;

    // Chờ đến khi hết hạn
    const expiresAt =
      booking.expiresAt instanceof Date
        ? booking.expiresAt
        : new Date(Date.now() + 10 * 60 * 1000);

    await step.sleepUntil("wait-until-expire", expiresAt);

    // Sau khi hết hạn, check nếu vẫn chưa thanh toán
    const now = new Date();
    const expiredBooking = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        $or: [{ isPaid: false }, { status: { $in: ["PENDING", "PENDING_PAYMENT"] } }],
        $or: [{ expiresAt: { $lte: now } }, { expiresAt: { $exists: false } }],
      },
      { $set: { status: "EXPIRED", expiredAt: now } },
      { new: true }
    ).lean();

    if (!expiredBooking) return;

    // Trả ghế
    const show = await Show.findById(expiredBooking.show);
    if (show && show.occupiedSeats) {
      for (const seat of expiredBooking.bookedSeats) {
        delete show.occupiedSeats[seat];
      }
      show.markModified("occupiedSeats");
      await show.save();
    }

    await step.log(`🟡 Released seats for expired booking: ${bookingId}`);
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

// Inngest Function: Handle payment success → confirm booking & send email
const handlePaymentSuccess = inngest.createFunction(
  { id: "payment-success-handler" },
  { event: "app/payment.success" },
  async ({ event, step }) => {
    const bookingId = event.data.bookingId;
    const booking = await Booking.findById(bookingId)
      .populate({ path: "show", populate: { path: "movie" } })
      .populate("user");

    if (!booking) {
      await step.run("log booking not found", async () => {
        console.log(`[PAYMENT] Booking not found: ${bookingId}`);
      });
    }

    // Nếu chưa mark là PAID, cập nhật lại
    if (booking.status !== "PAID" || !booking.isPaid) {
      booking.status = "PAID";
      booking.isPaid = true;
      booking.paidAt = new Date();
      await booking.save();
    }

    // Gửi email xác nhận
    if (booking?.user?.email) {
      await sendEmail({
        to: booking.user.email,
        subject: `🎟️ Booking Confirmed: ${booking.show.movie.title}`,
        body: bookingConfirmationEmail({
          user: booking.user,
          movieTitle: booking.show.movie.title,
          showDateTime: booking.show.showDateTime,
          bookedSeats: booking.bookedSeats,
          bookingLink: `https://teasonmike.io.vn/my-bookings`,
          supportLink: `https://teasonmike.io.vn`,
        }),
      });
    }

    await step.run("log success", async () => {
      console.log(`[PAYMENT] Confirmed booking + sent email: ${bookingId}`);
    });
  }
);


export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
  sendShowReminders,
  handlePaymentSuccess
];