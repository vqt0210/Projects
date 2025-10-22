import { Webhook } from "svix";
import User from "../models/User.js";

export const handleClerkWebhook = async (req, res) => {
  console.log("\n===== [CLERK WEBHOOK RECEIVED] =====");
  console.log("Headers:", JSON.stringify(req.headers, null, 2));

  const payload = req.body;
  const headers = req.headers;
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

  try {
    //  Xác minh chữ ký webhook (bắt buộc cho bảo mật)
    const evt = wh.verify(JSON.stringify(payload), headers);
    const eventType = evt.type;
    const data = evt.data;

    console.log(`[WEBHOOK] Event type: ${eventType}`);
    console.log("[WEBHOOK] Raw user data:", JSON.stringify(data, null, 2));

    //  Khi user được tạo mới hoặc cập nhật
    if (eventType === "user.created" || eventType === "user.updated") {
      const user = {
        _id: data.id,
        clerkId: data.id,
        name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
        email: data.email_addresses?.[0]?.email_address || null,
        image: data.image_url || data.profile_image_url || null,
      };

      console.log("[WEBHOOK] Parsed user object:", user);

      const saved = await User.findByIdAndUpdate(user._id, user, {
        upsert: true,
        new: true,
      });

      console.log(`[SYNC ✅] User ${eventType}: ${saved.email}`);
    }

    //  Khi user bị xóa
    if (eventType === "user.deleted") {
      await User.findByIdAndDelete(data.id);
      console.log(`[SYNC 🗑️] User deleted: ${data.id}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[❌ WEBHOOK ERROR]");
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);
    console.error("Raw body:", req.body?.toString());
    console.error("Headers:", JSON.stringify(req.headers, null, 2));

    return res.status(400).json({ error: "Invalid webhook signature" });
  }
};
