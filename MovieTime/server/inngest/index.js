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
import axios from "axios"; 

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
  { cron: "0 */2 * * *" },
  async ({ step }) => {
    const now = new Date(),
      in8h = new Date(now.getTime() + 8 * 60 * 60 * 1000),
      windowStart = new Date(in8h.getTime() - 10 * 60 * 1000);
    const shows = await Show.find({
      showDateTime: { $gte: windowStart, $lte: in8h },
    }).populate("movie");
    for (const show of shows) {
      const userIds = [...new Set(Object.values(show.occupiedSeats || {}))];
      const users = await User.find({ _id: { $in: userIds } });
      for (const user of users) {
        await sendEmail({
          to: user.email,
          subject: `Reminder: Your movie "${show.movie.title}" starts soon!`,
          body: showReminderEmail({
            user,
            movieTitle: show.movie.title,
            showDateTime: show.showDateTime,
            bookingLink: `https://teasonmike.io.vn/my-bookings`,
          }),
        });
      }
    }
  }
);

//  Handle payment success → confirm booking & send email
const handlePaymentSuccess = inngest.createFunction(
  { id: "payment-success-handler" },
  { event: "app/payment.success" },
  async ({ event, step }) => {
    try {
      const bookingId = event.data.bookingId;
      const booking = await Booking.findById(bookingId)
        .populate({ path: "show", populate: { path: "movie" } })
        .populate({ path: "userId", model: "User" });

      if (!booking) {
        console.log(`[PAYMENT] Booking not found: ${bookingId}`);
        return { success: false };
      }

      // Lấy thông tin user, fallback Clerk nếu local DB chưa sync
      let user = booking?.userId;
      if (!user?.email) {
        try {
          const clerkUser = await axios.get(
            `https://api.clerk.dev/v1/users/${booking.userId}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
              },
            }
          );

          user = {
            email: clerkUser.data.email_addresses?.[0]?.email_address,
            name: `${clerkUser.data.first_name || ""} ${
              clerkUser.data.last_name || ""
            }`.trim(),
            image: clerkUser.data.image_url,
          };
          console.log("[FALLBACK] Got email from Clerk:", user.email);
        } catch (e) {
          console.error("[FALLBACK] Clerk fetch failed:", e.message);
        }
      }

      //  Cập nhật trạng thái thanh toán
      if (booking.status !== "PAID" || !booking.isPaid) {
        booking.status = "PAID";
        booking.isPaid = true;
        booking.paidAt = new Date();
      }

      //  Tạo mã QR riêng cho booking
      const qrPayload = `https://www.teasonmike.io.vn/ticket/${booking._id}`;
      const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);
      booking.qrCode = qrCodeDataUrl;
      await booking.save();

      console.log(`[QR] Created QR for booking ${bookingId}`);

      //  Gửi email xác nhận
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: `🎟️ Booking Confirmed: ${booking.show.movie.title}`,
          body: bookingConfirmationEmail({
            user,
            movieTitle: booking.show.movie.title,
            showDateTime: booking.show.showDateTime,
            bookedSeats: booking.bookedSeats,
            bookingLink: `https://teasonmike.io.vn/ticket/${booking._id}`,
            supportLink: `https://teasonmike.io.vn`,
            qrImage: qrCodeDataUrl,
          }),
        });

        console.log(
          `[EMAIL] Sent booking confirmation with QR to ${user.email}`
        );
      } else {
        console.log(`[EMAIL] Skipped, user email not found`);
      }

      console.log(
        `[PAYMENT] Confirmed booking + QR + email sent: ${bookingId}`
      );
      return { success: true };
    } catch (error) {
      console.error("[PAYMENT] Handler failed:", error);
      throw error;
    }
  }
);

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendShowReminders,
  handlePaymentSuccess,
];
