// server/configs/resend.js

import dotenv from "dotenv";
dotenv.config();
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Gửi email qua Resend (thay thế hoàn toàn Nodemailer)
 * @param {Object} params
 * @param {string} params.to - email người nhận
 * @param {string} params.subject - tiêu đề
 * @param {string} params.body - nội dung HTML
 */
export default async function sendEmail({ to, subject, body }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY in environment variables");
  }

  if (!to) {
    console.warn("sendEmail skipped: missing recipient");
    return { status: "skipped", reason: "missing recipient" };
  }

  try {
    const response = await resend.emails.send({
      from: "MovieTime <noreply@teasonmike.io.vn>",
      to,
      subject,
      html: body,
    });

    // Resend trả về { data: { id: "..." } } nếu thành công
    if (response?.data?.id) {
      return {
        status: "sent",
        to,
        id: response.data.id,
      };
    } else {
      throw new Error(response?.error?.message || "Unknown error from Resend");
    }
  } catch (error) {
    console.error("Resend email error:", error);
    return {
      status: "failed",
      to,
      error: error.message,
    };
  }
}
