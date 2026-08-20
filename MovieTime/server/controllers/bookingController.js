import mongoose from "mongoose";
import Stripe from "stripe";
import { inngest } from "../inngest/index.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const checkSeatsAvailability = async (showId, selectedSeats) => {
  try {
    const showData = await Show.findById(showId);
    if (!showData) return false;

    // Chỉ tính ghế của booking còn "sống" (chưa hết hạn/chưa bị hủy) là
    // đang bị chiếm. Trước đây không lọc status nên booking EXPIRED/
    // CANCELLED vẫn khoá ghế vĩnh viễn dù đã được trả lại trong
    // Show.occupiedSeats — 2 nguồn dữ liệu lệch nhau gây bug ghế "ma".
    const bookings = await Booking.find({
      show: showId,
      status: { $nin: ["EXPIRED", "CANCELLED"] },
    });
    const occupiedSeats = bookings.flatMap((b) => b.bookedSeats);

    // true nếu tất cả ghế đều còn trống
    return !selectedSeats.some((seat) => occupiedSeats.includes(seat));
  } catch (error) {
    console.error("Seat check error:", error.message);
    return false;
  }
};

export const createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Kiểm tra người dùng đăng nhập
    const { userId } = req.auth() || {};
    if (!userId) {
      await session.abortTransaction();
      return res.status(401).json({
        success: false,
        message: "Unauthorized: user not logged in or token missing.",
      });
    }

    const { showId, selectedSeats, promoCode } = req.body;
    const { origin } = req.headers;

    if (
      !showId ||
      !Array.isArray(selectedSeats) ||
      selectedSeats.length === 0
    ) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Missing required fields: showId or selectedSeats",
      });
    }

    //  Kiểm tra suất chiếu
    const showData = await Show.findById(showId).populate("movie");
    if (!showData) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Show not found" });
    }

    // Kiểm tra ghế còn trống (dùng hàm riêng)
    const isAvailable = await checkSeatsAvailability(showId, selectedSeats);
    if (!isAvailable) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: "Selected seats are already booked",
      });
    }

    // Tính toán giá
    const baseAmount = Number(showData.showPrice) * selectedSeats.length;
    let finalAmount = baseAmount;
    let discountValue = 0;

    //  Áp dụng mã giảm giá
    if (promoCode) {
      try {
        const promos = await stripe.promotionCodes.list({
          code: promoCode,
          active: true,
        });

        if (promos.data.length > 0) {
          const promo = promos.data[0];
          discountValue = promo.coupon?.percent_off || 0;
          finalAmount = baseAmount - (baseAmount * discountValue) / 100;

          console.log(
            `[PROMO] Applied: ${promoCode} (-${discountValue}%) → $${finalAmount.toFixed(2)}`,
          );
        } else {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: "Invalid or inactive promo code.",
          });
        }
      } catch (err) {
        console.error("Stripe promo check failed:", err.message);
        await session.abortTransaction();
        return res.status(500).json({
          success: false,
          message: "Error verifying promo code.",
        });
      }
    }

    // Tạo booking trong DB
    const [booking] = await Booking.create(
      [
        {
          userId,
          show: showId,
          amount: finalAmount,
          discountValue,
          bookedSeats: selectedSeats,
          isPaid: false,
          status: "PENDING_PAYMENT",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      ],
      { session },
    );

    // Cập nhật ghế đã chọn trong show
    await Show.updateOne(
      { _id: showId },
      {
        $set: selectedSeats.reduce((acc, seat) => {
          acc[`occupiedSeats.${seat}`] = userId;
          return acc;
        }, {}),
      },
      { session },
    );

    //  Nếu giá = 0 → xác nhận, bỏ qua Stripe
    if (finalAmount <= 0) {
      booking.isPaid = true;
      booking.status = "CONFIRMED";
      booking.paymentLink = null;
      await booking.save({ session });

      await inngest.send({
        name: "app/show.booked",
        data: { bookingId: booking._id.toString() },
      });

      await session.commitTransaction();
      return res.status(200).json({
        success: true,
        message: "Booking confirmed (free ticket).",
        url: `${origin}/loading/my-bookings`,
      });
    }

    //  Tạo session thanh toán Stripe
    const stripeSession = await stripe.checkout.sessions.create({
      success_url: `${origin}/loading/my-bookings?bookingId=${booking._id}`,
      cancel_url: `${origin}/my-bookings`,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: showData.movie.title },
            unit_amount: Math.round(finalAmount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: { bookingId: booking._id.toString() },
    });

    //  Lưu thông tin thanh toán Stripe
    booking.paymentLink = stripeSession.url;
    booking.checkoutSessionId = stripeSession.id;
    await booking.save({ session });

    // Gửi event đến Inngest
    // Chỉ gửi "app/show.booked" — trigger releaseSeatsAndDeleteBooking, cơ
    // chế tự hủy booking + trả ghế sau 10 phút nếu chưa thanh toán. Áp
    // dụng cho MỌI booking (trả phí hay miễn phí).
    //
    // KHÔNG gửi "app/payment.success" ở đây nữa. Trước đây event này bị
    // gửi ngay lúc tạo booking — tức là TRƯỚC khi Stripe xác nhận thanh
    // toán thật — khiến handlePaymentSuccess có thể mark isPaid=true và
    // gửi vé/QR dù người dùng chưa hề trả tiền. Việc xác nhận thanh toán
    // + tạo vé giờ chỉ chạy đúng 1 chỗ duy nhất: trong stripeWebhooks
    // (server/controllers/stripeController.js), sau khi Stripe xác nhận
    // checkout.session.completed thật sự, qua event "app/ticket.confirmed".
    await inngest.send({
      name: "app/show.booked",
      data: { bookingId: booking._id.toString() },
    });

    await session.commitTransaction();

    // Phản hồi thành công
    res.status(200).json({
      success: true,
      message: "Booking created successfully",
      url: stripeSession.url,
    });
  } catch (error) {
    console.error("Create booking error:", error.message);
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

//  Get occupied seats
export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    const showData = await Show.findById(showId);
    if (!showData)
      return res.json({ success: false, message: "Show not found" });

    const bookings = await Booking.find({
      show: showId,
      status: { $nin: ["EXPIRED", "CANCELLED"] },
    });
    const occupiedSeats = bookings.flatMap((b) => b.bookedSeats);

    res.json({ success: true, occupiedSeats });
  } catch (error) {
    console.error("Get occupied seats error:", error.message);
    res.json({ success: false, message: error.message });
  }
};
