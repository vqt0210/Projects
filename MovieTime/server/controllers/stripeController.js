import Stripe from "stripe";
import Booking from "../models/Booking.js";
import { inngest } from "../inngest/index.js";
import QRCode from "qrcode";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("[WEBHOOK] verify failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Trả OK sớm để Stripe không retry
  res.status(200).json({ received: true });

  //  Xử lý bất đồng bộ trong setImmediate để không chặn Stripe
  setImmediate(async () => {
    try {
      console.log("[WEBHOOK] type:", event.type);
      let bookingId = null;

      if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object;
        bookingId = pi?.metadata?.bookingId;
      } else if (event.type === "checkout.session.completed") {
        const s = event.data.object;
        bookingId = s?.metadata?.bookingId || null;

        if (!bookingId && s.payment_intent) {
          try {
            const pi = await stripe.paymentIntents.retrieve(s.payment_intent);
            bookingId = pi?.metadata?.bookingId;
          } catch (e) {
            console.error("[WEBHOOK] Cannot retrieve PI:", e.message);
          }
        }
      }

      if (!bookingId) {
        console.warn("[WEBHOOK] Missing bookingId in event");
        return;
      }

      const booking = await Booking.findById(bookingId).populate({
        path: "show",
        populate: { path: "movie" },
      });

      if (!booking) {
        console.warn("[WEBHOOK] Booking not found:", bookingId);
        return;
      }

      // Nếu chưa thanh toán mới cập nhật
      if (!booking.isPaid) {
        // Sinh mã vé và QR
        const ticketCode = `MT${Date.now().toString().slice(-6)}`;
        const qrPayload = {
          ticketCode,
          movie: booking.show.movie.title,
          showtime: booking.show.showDateTime,
          seats: booking.bookedSeats,
          amount: booking.amount,
        };
        const qrImage = await QRCode.toDataURL(JSON.stringify(qrPayload));

        // Cập nhật trạng thái & QR
        booking.status = "PAID";
        booking.isPaid = true;
        booking.paidAt = new Date();
        booking.qrCode = qrImage;
        booking.ticketCode = ticketCode;
        booking.paymentLink = "";
        await booking.save();

        console.log("[WEBHOOK] Booking marked as PAID:", bookingId);

        //  Gửi real-time cập nhật
        if (global._io) {
          global._io.emit("paymentUpdate", { bookingId });
          console.log("Real-time emit sent to client");
        }

        // Trigger email gửi vé qua Inngest
        await inngest.send({
          name: "app/ticket.confirmed",
          data: {
            bookingId,
            ticketCode,
            qrImage,
          },
        });
      } else {
        console.log("[WEBHOOK] Booking already paid:", bookingId);
      }
    } catch (err) {
      console.error("[WEBHOOK] processing error:", err);
    }
  });
};

// Kiểm tra mã giảm giá
export const checkStripePromo = async (req, res) => {
  try {
    const { code, price } = req.body;
    if (!code)
      return res.json({ success: false, message: "Promo code required" });

    const promos = await stripe.promotionCodes.list({
      code,
      active: true,
      limit: 1,
    });

    if (promos.data.length === 0)
      return res.json({
        success: false,
        message: "Invalid or inactive promo code",
      });

    const promo = promos.data[0];
    const discountPercent = promo.coupon?.percent_off || 0;

    const discountAmount = ((price || 0) * discountPercent) / 100;
    const finalPrice = Math.max((price || 0) - discountAmount, 0);

    console.log(
      `[PROMO] Applied: ${code} (-${discountPercent}%) → $${finalPrice.toFixed(
        2,
      )}`,
    );

    return res.json({
      success: true,
      code,
      discountValue: discountPercent,
      finalPrice,
      stripePromoId: promo.id,
    });
  } catch (err) {
    console.error("[PROMO] Error:", err.message);
    return res.json({
      success: false,
      message: "Error checking promo code",
    });
  }
};
