// configs/nodemailer.js
import nodemailer from "nodemailer";

const RAW_SENDER = (process.env.SENDER_EMAIL || "").trim();
const SENDER = RAW_SENDER.toLowerCase();
const REPLY_TO = (process.env.REPLY_TO || RAW_SENDER).trim();
const isGmail = /@(gmail\.com|googlemail\.com)$/.test(SENDER);

// Gmail app password: Gmail hiển thị có khoảng trắng -> loại bỏ
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");

if (!SENDER) {
  throw new Error("SENDER_EMAIL is required");
}
if (isGmail && !GMAIL_APP_PASSWORD) {
  throw new Error("GMAIL_APP_PASSWORD is required when SENDER_EMAIL is a Gmail address");
}

// Khởi tạo transporter theo loại tài khoản
const transporter = isGmail
  ? nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: SENDER,                 // phải đúng email Gmail thật
        pass: GMAIL_APP_PASSWORD,     // App Password 16 ký tự, KHÔNG khoảng trắng
      },
    })
  : nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

// verify 1 lần sau khi khởi tạo
let verifiedOnce = false;
async function ensureVerified() {
  if (!verifiedOnce) {
    await transporter.verify();
    verifiedOnce = true;
  }
}

export default async function sendEmail({ to, subject, body, from }) {
  await ensureVerified();

  // Gmail bắt buộc "from" phải chính là tài khoản đăng nhập (hoặc alias đã cấu hình trong "Send mail as")
  const fromAddr = isGmail ? SENDER : (from || SENDER);

  const info = await transporter.sendMail({
    from: `MovieTeam <${fromAddr}>`,
    to,
    subject,
    html: body,
    replyTo: REPLY_TO,
  });

  return {
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
    messageId: info.messageId,
  };
}
