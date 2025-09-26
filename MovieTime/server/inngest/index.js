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
  {id:'release-seats-delete-booking'},
  {event: "app/checkpayment"},
  async ({event, step}) => {
      const tenMinutesLater = new Date(Date.now() + 10 * 60 *1000);
      await step.sleepUntil('wait-for-10-minutes', tenMinutesLater);

      await step.run('check-payment-status', async ()=>{
        const bookingId = event.data.bookingId;
        const booking = await Booking.findById(bookingId)
        if (!booking) return;

        const amount = Number(booking.amount) || 0;
        // Bỏ qua free/đã trả/đã confirm
        if (amount <= 0 || booking.isPaid === true || booking.status === "CONFIRMED") {
          return;
        }


        // If payment is not made, release seats and delete booking
          const show = await Show.findById(booking.show);
          booking.bookedSeats.forEach((seat) => {
            delete show.occupiedSeats[seat]
          });
          show.markModified('occupiedSeats')
          await show.save()
          await Booking.findByIdAndDelete(booking._id)
        
      })
  }
)

// Inngest Function to send email when user books a show
const sendBookingConfirmationEmail = inngest.createFunction(
  { id: "send-booking-confirmation-email" },
  { event: "app/show.booked" },
  async ({ event, step }) => {
    const { bookingId } = event.data;

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



export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail
];