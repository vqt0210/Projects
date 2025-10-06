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

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;           // Stripe.PaymentIntent
      let bookingId = pi?.metadata?.bookingId;

      if (!bookingId) {
        console.warn("[WEBHOOK] PI succeeded but missing bookingId:", pi.id);
        return res.json({ received: true });  // Không biết update booking nào -> bỏ qua
      }

      const upd = await Booking.updateOne(
        { _id: bookingId },                    // không cần guard status nữa khi test
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

      console.log("[WEBHOOK] PAID via PI:", {
        bookingId,
        matched: upd.matchedCount,
        modified: upd.modifiedCount,
      });

      if (upd.modifiedCount === 1) {
        await inngest.send({ name: "app/show.booked", data: { bookingId } });
      }
    }

    else if (event.type === "checkout.session.completed") {
      const s = event.data.object;            // Stripe.Checkout.Session
      let bookingId = s?.metadata?.bookingId;

      // Lấy bookingId từ PaymentIntent nếu session không có
      if (!bookingId) {
        const piId =
          typeof s.payment_intent === "string"
            ? s.payment_intent
            : s.payment_intent?.id;

        if (piId) {
          const pi = await stripe.paymentIntents.retrieve(piId);
          bookingId = pi?.metadata?.bookingId;
        }
      }

      if (!bookingId) {
        console.warn("[WEBHOOK] Session completed but missing bookingId");
        return res.json({ received: true });
      }

      const upd = await Booking.updateOne(
        { _id: bookingId },
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

      console.log("[WEBHOOK] PAID via session:", {
        bookingId,
        matched: upd.matchedCount,
        modified: upd.modifiedCount,
      });

      if (upd.modifiedCount === 1) {
        await inngest.send({ name: "app/show.booked", data: { bookingId } });
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
