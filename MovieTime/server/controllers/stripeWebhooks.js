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

  try {
    console.log("[WEBHOOK] type:", event.type);

    // Handle payment_intent.succeeded
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      const bookingId = pi?.metadata?.bookingId;

      if (!bookingId) {
        console.warn("[WEBHOOK] Missing bookingId in PaymentIntent:", pi.id);
        return res.json({ received: true });
      }

      const upd = await Booking.updateOne(
        { _id: bookingId, isPaid: false },
        {
          $set: {
            status: "PAID",
            isPaid: true,
            paidAt: new Date(),
            paymentIntentId: pi.id,
            paymentLink: "",
          },
        }
      );

      console.log("[WEBHOOK] PAID via PI:", bookingId, upd);

      if (global._io) {
        global._io.emit("paymentUpdate", { bookingId });
        console.log("Realtime emit (PI):", bookingId);
      }

      // Không gửi Inngest ở đây để tránh chạy trùng
    }

    // Handle checkout.session.completed
    else if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      let bookingId = s?.metadata?.bookingId;

      if (!bookingId && s.payment_intent) {
        const piId =
          typeof s.payment_intent === "string"
            ? s.payment_intent
            : s.payment_intent?.id;

        try {
          const pi = await stripe.paymentIntents.retrieve(piId);
          bookingId = pi?.metadata?.bookingId;
        } catch (err) {
          console.error("[WEBHOOK] Cannot retrieve PI:", err.message);
        }
      }

      if (!bookingId) {
        console.warn("[WEBHOOK] Missing bookingId in session:", s.id);
        return res.json({ received: true });
      }

      const upd = await Booking.updateOne(
        { _id: bookingId, isPaid: false },
        {
          $set: {
            status: "PAID",
            isPaid: true,
            paidAt: new Date(),
            checkoutSessionId: s.id,
            paymentLink: "",
          },
        }
      );

      console.log("[WEBHOOK] PAID via session:", bookingId, upd);

      if (global._io) {
        global._io.emit("paymentUpdate", { bookingId });
        console.log("Realtime emit (Session):", bookingId);
      }

      // Chỉ trigger Inngest khi DB thật sự update
      if (upd.modifiedCount === 1) {
        await inngest.send({
          name: "app/payment.success",
          data: { bookingId },
        });
      }
    }

    else {
      console.log("[WEBHOOK] Unhandled event:", event.type);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("[WEBHOOK] processing error:", err);
    return res.status(500).send("Internal Server Error");
  }
};
