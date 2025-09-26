

// Function to check availability of selected seats for a movie

import { inngest } from "../inngest/index.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import Stripe from 'stripe'

const checkSeatsAvailability = async (showId, selectedSeats) => {
  try {
    const showData = await Show.findById(showId);
    if (!showData) return false;

    // Lấy tất cả bookings của show
    const bookings = await Booking.find({ show: showId });

    // Lấy danh sách ghế đã đặt
    const occupiedSeats = bookings.flatMap(b => b.bookedSeats);

    // Kiểm tra có seat nào bị trùng không
    const isAnySeatTaken = selectedSeats.some(seat =>
      occupiedSeats.includes(seat)
    );

    return !isAnySeatTaken;
  } catch (error) {
    console.log(error.message);
    return false;
  }
};

export const createBooking = async (req, res)=>{
  try {
    const {userId} = req.auth();
    const {showId, selectedSeats} = req.body;
    const { origin } = req.headers;

    // Check if the seat is available for the selected show
    const isAvailable = await checkSeatsAvailability(showId, selectedSeats)
    
    if(!isAvailable){
      return res.json({success: false, message: "Selected Seats are not available."})
    }

    // Get the show details
    const showData = await Show.findById(showId).populate('movie');
    const amount = Number(showData.showPrice) * selectedSeats.length;   // tổng tiền

    // Create a new booking

    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: showData.showPrice * selectedSeats.length,
      bookedSeats: selectedSeats,
      isPaid: false,
      status: "HOLD",
    });

        // cập nhật occupiedSeats
    if (!showData.occupiedSeats) showData.occupiedSeats = {};
    selectedSeats.forEach(seat => { showData.occupiedSeats[seat] = userId; });
    showData.markModified("occupiedSeats");
    await showData.save();
    // FREE BOOKING (amount = 0): confirm ngay, KHÔNG Stripe, KHÔNG checkpayment
    if (amount <= 0) {
      booking.isPaid = true;
      booking.status = "CONFIRMED";
      booking.paymentLink = null;
      await booking.save();
    await inngest.send({
        name: "app/show.booked",
        data: { bookingId: booking._id.toString() },
      });
    return res.json({ success: true, url: `${origin}/loading/my-bookings` });
    }

    selectedSeats.forEach(seat => {
    showData.occupiedSeats[seat] = userId;
    });

    showData.markModified('occupiedSeats');

    await showData.save();

    // Stripe Gateway Initialize
    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)

    // Creating line items to for Stripe
    const line_items = [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: showData.movie.title
        },
        unit_amount: showData.showPrice * 100,
      },
      quantity: selectedSeats.length
    }]

    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      line_items: line_items,
      mode: 'payment',
      locale: 'en',
      metadata: {
        bookingId: booking._id.toString()
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, //Expires in 30 minutes
    })

    booking.paymentLink = session.url
    await booking.save()

    // Run Inngest Scheduler Function to check payment status after 10 minutes
    await inngest.send({
      name: "app/checkpayment",
      data: {
        bookingId: booking._id.toString()
      }
    })

    

    res.json({success: true, url: session.url})

  } catch (error) {
    console.log(error.message);
    res.json({success: false, message: error.message})
  }
}

export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;

    // Kiểm tra show có tồn tại
    const showData = await Show.findById(showId);
    if (!showData) {
      return res.json({ success: false, message: "Show not found" });
    }

    // Lấy tất cả booking của show
    const bookings = await Booking.find({ show: showId });

    // Gom tất cả bookedSeats lại thành 1 mảng
    const occupiedSeats = bookings.flatMap(b => b.bookedSeats);

    res.json({ success: true, occupiedSeats });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
