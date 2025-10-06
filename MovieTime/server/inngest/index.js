import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/nodemailer.js";
import Movie from "../models/Movie.js";

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
        // chưa thanh toán/chưa confirm
        $or: [{ isPaid: { $ne: true } }, { status: { $nin: ["PAID", "CONFIRMED"] } }],
        // đã quá hạn
        $or: [
          { expiresAt: { $lte: now } },
          { expiresAt: { $exists: false } }, // phòng TH cũ chưa có field
        ],
        // chỉ khi vẫn đang pending
        status: { $in: ["PENDING_PAYMENT", null, undefined] },
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
  { id: "send-booking-confirmation-email-v2" },
  { event: "app/show.booked" },
  async ({ event, step }) => {
    const { bookingId } = event.data;
    if (typeof step?.log !== 'function') step.log = async () => {};

    const booking = await Booking.findById(bookingId)
      .populate({ path: 'show', populate: { path: 'movie', model: 'Movie' } })
      .populate('user');

    if (!booking) {
      // Dùng step.run để “log” và hiển thị trong Output
      await step.run('log:skip-no-booking', async () => ({ bookingId }));
      return { status: 'skip', reason: 'no_booking', bookingId };
    }

    const to = booking?.user?.email;

    await step.run('log:recipient', async () => ({ to }));

    if (!to) {
      await step.run('log:missing-email', async () => ({
        bookingId,
        userId: booking?.user?._id || null
      }));
      return { status: 'skip', reason: 'missing_email', bookingId, userId: booking?.user?._id || null };
    }

    // Gửi mail và trả info để thấy trong Output
    const info = await step.run('send-email', async () => {
      return await sendEmail({
        to,
        subject: `Payment Confirmation: "${booking.show.movie.title}" booked!`,
        body: `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Hi ${booking.user.name || ''},</h2>
          <p>Your booking for <strong style="color:#F84565;">"${booking.show.movie.title}"</strong> is confirmed.</p>
          <p>
            <strong>Date:</strong> ${new Date(booking.show.showDateTime).toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}<br/>
            <strong>Time:</strong> ${new Date(booking.show.showDateTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}
          </p>
          <p>Enjoy the show! 🎞🎭</p>
          <p>Thanks for booking with us!<br/>MovieTeam</p>
        </div>`
      });
    });

    // “log” kết quả SMTP (cũng hiện trong Output)
    await step.run('log:smtp-result', async () => info);

    return { status: 'sent', to, ...info };
  }
);

// Inngest Function to send reminders
const sendShowReminders = inngest.createFunction(
  {id: "sendShowReminders"},
  { cron: "0 */8 * * *" }, //Every 8 hours
  async({ step })=>{
    const now = new Date();
    const in8Hours = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const windowStart = new Date(in8Hours.getTime() - 10 * 60 * 1000);

    // Prepare reminder tasks
    const reminderTasks = await step.run
    ("prepare-reminder-tasks", async() => {
      const shows = await Show.find({
        showTime: { $gte: windowStart, $lte: in8Hours },
      }).populate('movie');

      const tasks = [];

      for(const show of shows){
        if(!show.movie || !show.occupiedSeats) continue;

        const userIds = [...new set(Object.values(show.occupiedSeats))];
        if(userIds.length === 0) continue;

        const users = await User.find({_id: {$in: userIds}}).select("name email");

        for(const user of users){
          tasks.push({
            userEmail: user.email,
            userName: user.name,
            movieTitle: show.movie.title,
            showTime: show.showTime,
          })
        }

      }
      return tasks;
    })

    if(reminderTasks.length === 0){
      return {sent: 0, message: "No reminder to send"}
    }

    // Send reminder emails
    const results = await step.run('send-all-reminders', async() => {
      return await Promise.allSettled(
        reminderTasks.map(task => sendEmail({
          to: task.userEmail,
          subject: `Reminder: Your movie "${task.movieTitle}" starts soon!`,
          body: `<div style="font-family: Arial, sans-serif; padding: 20px">
            <h2>Hello ${task.userName},</h2>
            <p>This is a quick reminder that your movie:</p>
            <h3 style="color: #F84565;">"${task.movieTitle}"</h3>
            <p>
              is scheduled for <strong>${new Date(task.showTime).toLocaleDateString('en-US' , {timeZone: 'Asia/Ho_Chi_Minh' })}</strong> at
              <strong>${new Date(task.showTime).toLocaleTimeString('en-US', {timeZone: 'Asia/Ho_Chi_Minh'})}</strong>
            
            </p>
            <p>
              It starts in approximately <strong>8 hour</strong>
              - make sure you're reader
              <br/>
              <p>Enjoy the show!<br/>MovieTeam</p>

            </p> 
          
          </div>`
        }))
      )
    })

    const sent = results.filter(r => r.status === "fulfilled").length;
    const failed = results.length - sent;

    return {
      sent,
      failed,
      message: `Sent ${sent} reminder(s), ${failed} failed.`
    }
  }
)

// Inngest Function to send notifications when a new show is added
const sendNewShowNotifications = inngest.createFunction(
  {id: "send-new-show-notification"},
  { event: "app/show.added"},
  async({ event }) => {
    const { movieTitle} = event.data;

    const users = await User.find({})

    for(const user of users){
      const userEmail = user.email;
      const userName = user.name;

      const subject = ` 🎬 New Show Added: ${movieTitle}`;
      const body = `<div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Hi ${userName},</h2>
                    <p>We've just added a new show to our library:</p>
                    <h3 style="color: #F84565;">"${movieTitle}"</h3>
                    <p>Visit our website</p>
                    <br/>
                    <p>Thanks,<br/>MovieTeam</p>
      
      </div>`;
      await sendEmail({
        to: userEmail,
        subject,
        body,
    })
    }
    return {message: "Notification sent."}

    
  }
)

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
  sendShowReminders,
  sendNewShowNotifications
];