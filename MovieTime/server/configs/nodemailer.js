// configs/nodemailer.js
import nodemailer from "nodemailer";

const SENDER = process.env.SENDER_EMAIL || "";
const REPLY_TO = process.env.REPLY_TO || SENDER;

// Gmail: dùng khi From là @gmail.com / @googlemail.com
const isGmail = /@(gmail\.com|googlemail\.com)$/i.test(SENDER);

// Khởi tạo transporter theo loại tài khoản
const transporter = isGmail
  ? nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: SENDER,                          // chính email Gmail
        pass: process.env.GMAIL_APP_PASSWORD,  
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

// (tuỳ chọn) verify một lần khi khởi tạo – tránh verify mỗi lần gửi
let verifiedOnce = false;
async function ensureVerified() {
  if (verifiedOnce) return;
  await transporter.verify();
  verifiedOnce = true;
}

const sendEmail = async ({ to, subject, body, from = SENDER }) => {
  await ensureVerified();

  const info = await transporter.sendMail({
    from: `MovieTeam <${from}>`,   // Gmail: phải đúng chính SENDER
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
};

export default sendEmail;
