import { inngest } from "../inngest/index.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const checkSeatsAvailability = async (showId, selectedSeats) => {
  try {
    const showData = await Show.findById(showId);
    if (!showData) return false;

    // Lấy tất cả bookings của show
    const bookings = await Booking.find({ show: showId });

    // Lấy danh sách ghế đã đặt
    const occupiedSeats = bookings.flatMap((b) => b.bookedSeats);

    // Kiểm tra có seat nào bị trùng không
    return !selectedSeats.some((seat) => occupiedSeats.includes(seat));
  } catch (error) {
    console.error("Seat check error:", error.message);
    return false;
  }
};

export const createBooking = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { showId, selectedSeats, promoCode } = req.body;
    const { origin } = req.headers;

    // Kiểm tra ghế trống
    const isAvailable = await checkSeatsAvailability(showId, selectedSeats);
    if (!isAvailable) {
      return res.json({
        success: false,
        message: "Selected seats are not available.",
      });
    }

    const showData = await Show.findById(showId).populate("movie");
    if (!showData)
      return res.json({ success: false, message: "Show not found." });

    const amount = Number(showData.showPrice) * selectedSeats.length;

    // Kiểm tra mã giảm giá với Stripe
    let promotion = null;
    if (promoCode) {
      try {
        const promos = await stripe.promotionCodes.list({
          code: promoCode,
          active: true,
        });

        if (promos.data.length > 0) {
          promotion = promos.data[0];
          console.log(`[PROMO] Applied ${promoCode}`);
        } else {
          return res.json({
            success: false,
            message: "Invalid or inactive promo code.",
          });
        }
      } catch (err) {
        console.error("Stripe promo check failed:", err.message);
        return res.json({
          success: false,
          message: "Error verifying promo code.",
        });
      }
    }

    // Tạo booking trong DB
    const booking = await Booking.create({
      userId,
      show: showId,
      amount,
      bookedSeats: selectedSeats,
      isPaid: false,
      status: "PENDING_PAYMENT",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Cập nhật ghế đã chọn
    if (!showData.occupiedSeats) showData.occupiedSeats = {};
    selectedSeats.forEach((seat) => {
      showData.occupiedSeats[seat] = userId;
    });
    showData.markModified("occupiedSeats");
    await showData.save();

    // Nếu giá = 0 thì auto xác nhận
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

    // Tạo session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: showData.movie.title },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      discounts: promotion ? [{ promotion_code: promotion.id }] : [],
      metadata: { bookingId: booking._id.toString() },
    });

    //  Lưu thông tin thanh toán vào DB
    booking.paymentLink = session.url;
    booking.checkoutSessionId = session.id;
    await booking.save();

    //  Gửi event check payment
    await inngest.send({
      name: "app/checkpayment",
      data: { bookingId: booking._id.toString() },
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error("Create booking error:", error.message);
    res.json({ success: false, message: error.message });
  }
};

//  Get occupied seats 
export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    const showData = await Show.findById(showId);
    if (!showData)
      return res.json({ success: false, message: "Show not found" });

    const bookings = await Booking.find({ show: showId });
    const occupiedSeats = bookings.flatMap((b) => b.bookedSeats);

    res.json({ success: true, occupiedSeats });
  } catch (error) {
    console.error("Get occupied seats error:", error.message);
    res.json({ success: false, message: error.message });
  }
};
