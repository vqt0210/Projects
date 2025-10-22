import Stripe from "stripe";
import Booking from "../models/Booking.js";
import { inngest } from "../inngest/index.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[WEBHOOK] verify failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  //  Trả OK sớm để Stripe không retry
  res.status(200).json({ received: true });

  // Xử lý bất đồng bộ
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

        // Nếu metadata trống → truy xuất từ payment_intent
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

      const upd = await Booking.updateOne(
        { _id: bookingId, isPaid: false },
        {
          $set: {
            status: "PAID",
            isPaid: true,
            paidAt: new Date(),
            paymentLink: "",
          },
        }
      );

      if (upd.modifiedCount === 1) {
        console.log("[WEBHOOK] Booking marked as PAID:", bookingId);

        if (global._io) {
          global._io.emit("paymentUpdate", { bookingId });
          console.log("Real-time emit sent to client");
        }

        await inngest.send({
          name: "app/payment.success",
          data: { bookingId },
        });
      } else {
        console.log("[WEBHOOK] No update — already paid or missing booking");
      }
    } catch (err) {
      console.error("[WEBHOOK] processing error:", err);
    }
  });
};


export const checkStripePromo = async (req, res) => {
  try {
    const { code, price } = req.body;
    if (!code) return res.json({ success: false, message: "Promo code required" });

    // Lấy danh sách promotion code từ Stripe
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

    // Tính toán giảm giá (theo phần trăm)
    const discountAmount = ((price || 0) * discountPercent) / 100;
    const finalPrice = Math.max((price || 0) - discountAmount, 0);

    console.log(`[PROMO] Applied: ${code} (-${discountPercent}%) → $${finalPrice.toFixed(2)}`);

    return res.json({
      success: true,
      code,
      discountValue: discountPercent,
      finalPrice,
      stripePromoId: promo.id,
    });
  } catch (err) {
    console.error("[PROMO] Error:", err.message);
    return res.json({ success: false, message: "Error checking promo code" });
  }
};
