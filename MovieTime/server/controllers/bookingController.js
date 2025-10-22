import { inngest } from "../inngest/index.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const checkSeatsAvailability = async (showId, selectedSeats) => {
  try {
    const showData = await Show.findById(showId);
    if (!showData) return false;

    const bookings = await Booking.find({ show: showId });
    const occupiedSeats = bookings.flatMap((b) => b.bookedSeats);
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

    //  Kiểm tra ghế còn trống
    const isAvailable = await checkSeatsAvailability(showId, selectedSeats);
    if (!isAvailable) {
      return res.json({
        success: false,
        message: "Selected seats are not available.",
      });
    }

    // Lấy thông tin suất chiếu
    const showData = await Show.findById(showId).populate("movie");
    if (!showData)
      return res.json({ success: false, message: "Show not found." });

    const baseAmount = Number(showData.showPrice) * selectedSeats.length;
    let finalAmount = baseAmount;
    let discountValue = 0;
    let promotion = null;

    //  Kiểm tra mã giảm giá trên Stripe
    if (promoCode) {
      try {
        const promos = await stripe.promotionCodes.list({
          code: promoCode,
          active: true,
        });

        if (promos.data.length > 0) {
          promotion = promos.data[0];
          discountValue = promotion.coupon?.percent_off || 0;
          finalAmount = baseAmount - (baseAmount * discountValue) / 100;

          console.log(
            `[PROMO] Applied: ${promoCode} (-${discountValue}%) → $${finalAmount.toFixed(
              2
            )}`
          );
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

    //  Tạo booking trong DB
    const booking = await Booking.create({
      userId,
      show: showId,
      amount: finalAmount, // giá sau giảm
      discountValue, // phần trăm giảm giá
      bookedSeats: selectedSeats,
      isPaid: false,
      status: "PENDING_PAYMENT",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    //  Cập nhật ghế đã chọn
    if (!showData.occupiedSeats) showData.occupiedSeats = {};
    selectedSeats.forEach((seat) => {
      showData.occupiedSeats[seat] = userId;
    });
    showData.markModified("occupiedSeats");
    await Show.updateOne(
  { _id: showId },
  {
    $set: selectedSeats.reduce((acc, seat) => {
      acc[`occupiedSeats.${seat}`] = userId;
      return acc;
    }, {}),
  }
);

    //  Nếu giá = 0 → tự xác nhận luôn
    if (finalAmount <= 0) {
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

    //  Tạo session thanh toán Stripe
    const session = await stripe.checkout.sessions.create({
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: showData.movie.title },
            unit_amount: Math.round(finalAmount * 100), // đơn vị cent
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: { bookingId: booking._id.toString() },
    });

    //  Lưu lại session Stripe
    booking.paymentLink = session.url;
    booking.checkoutSessionId = session.id;
    await booking.save();

    // Gửi event check payment (Inngest)
    await inngest.send({
      name: "app/checkpayment",
      data: { bookingId: booking._id.toString() },
    });

    // Trả URL Stripe
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
