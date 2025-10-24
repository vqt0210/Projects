import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../configs/resend.js";
import {
  bookingConfirmationEmail,
  showReminderEmail,
} from "../email/template.js";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { downloadPoster } from "../utils/downloadPoster.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-time" });

// Inngest Function to save user data to a database
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: first_name + " " + last_name,
      image: image_url,
    };
    await User.findByIdAndUpdate(id, userData, { upsert: true, new: true });
  }
);

// Inngest Function to delete user from database
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { id } = event.data;
    await User.findByIdAndDelete(id);
  }
);

// Inngest Function to update user data in database

const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    const userData = {
      _id: id,
      email: email_addresses?.[0]?.email_address || "",
      name: first_name + " " + last_name,
      image: image_url,
    };
    await User.findByIdAndUpdate(id, userData);
  }
);

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
        $and: [
          {
            $or: [
              { isPaid: false },
              { status: { $in: ["PENDING", "PENDING_PAYMENT"] } },
            ],
          },
          {
            $or: [
              { expiresAt: { $lte: now } },
              { expiresAt: { $exists: false } },
            ],
          },
        ],
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

    await step.run("log expired booking", async () => {
      console.log(`Released seats for expired booking: ${bookingId}`);
    });
  }
);

// Inngest Function to send reminders
const sendShowReminders = inngest.createFunction(
  { id: "send-show-reminders" },
  { cron: "0 */2 * * *" }, // chạy mỗi 2 tiếng
  async ({ step }) => {
    const now = new Date();
    const in8h = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const windowStart = new Date(in8h.getTime() - 10 * 60 * 1000);

    // Lấy tất cả các show sắp chiếu trong 8 tiếng tới
    const shows = await Show.find({
      showDateTime: { $gte: windowStart, $lte: in8h },
    }).populate("movie");

    for (const show of shows) {
      // Lấy tất cả bookings đã thanh toán của show này
      const bookings = await Booking.find({
        show: show._id,
        isPaid: true,
      }).populate("userId");

      for (const booking of bookings) {
        const user = booking.userId;
        if (!user?.email) continue;

        await sendEmail({
          to: user.email,
          subject: `🎬 Reminder: "${show.movie.title}" starts soon!`,
          body: showReminderEmail({
            user,
            movieTitle: show.movie.title,
            showDateTime: show.showDateTime,
            bookingLink: `https://teasonmike.io.vn/ticket/${booking._id}`,
            posterUrl: show.movie.poster_path
              ? `https://image.tmdb.org/t/p/w500${show.movie.poster_path}`
              : "https://teasonmike.io.vn/assets/fallBack.jpg",
            supportLink: `https://teasonmike.io.vn`,
          }),
        });

        console.log(
          `[REMINDER] Sent to ${user.email} for booking ${booking._id}`
        );
      }
    }
  }
);

//  Handle payment success → confirm booking & send email
const qrDir = path.join(process.cwd(), "public", "qr");
if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

const handlePaymentSuccess = inngest.createFunction(
  { id: "payment-success-handler" },
  { event: "app/payment.success" },
  async ({ event, step }) => {
    try {
      const bookingId = event.data.bookingId;
      const booking = await Booking.findById(bookingId)
        .populate({ path: "show", populate: { path: "movie" } })
        .populate({ path: "userId", model: "User" });

      if (!booking) return { success: false };

      // Cập nhật trạng thái thanh toán
      booking.status = "PAID";
      booking.isPaid = true;
      booking.paidAt = new Date();

      // Tạo file QR trên server
      const ticketUrl = `https://teasonmike.io.vn/ticket/${booking._id}`;
      const qrPath = path.join(qrDir, `${booking._id}.png`);
      await QRCode.toFile(qrPath, ticketUrl, { width: 300, margin: 2 });

      const qrUrl = `https://server.teasonmike.io.vn/qr/${booking._id}.png`;
      booking.qrCode = qrUrl;
      await booking.save();

      const posterUrl = await downloadPoster(
        booking.show.movie.poster_path,
        booking.show.movie._id
      );

      // Gửi email xác nhận
      const user = booking.userId;
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: `🎟️ Booking Confirmed: ${booking.show.movie.title}`,
          body: bookingConfirmationEmail({
            user,
            movieTitle: booking.show.movie.title,
            showDateTime: booking.show.showDateTime,
            bookedSeats: booking.bookedSeats,
            bookingLink: ticketUrl,
            supportLink: "https://teasonmike.io.vn",
            qrImage: qrUrl,
            posterUrl,
          }),
        });
      }

      console.log(`[QR] Created and sent for booking ${bookingId}`);
      return { success: true };
    } catch (error) {
      console.error("[PAYMENT] Handler failed:", error);
      throw error;
    }
  }
);

// Auto cleanup old QR & Poster files daily
const cleanupOldFiles = inngest.createFunction(
  { id: "cleanup-files-daily" },
  { cron: "0 0 * * *" },
  async ({ step }) => {
    await import("../cleanupFiles.js");
    console.log("✅ Daily cleanup (QR + Poster) done!");
  }
);

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendShowReminders,
  handlePaymentSuccess,
  cleanupOldFiles, 
];
