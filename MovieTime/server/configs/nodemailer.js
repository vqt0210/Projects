import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465, // chỉ true nếu 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, body, from = process.env.SENDER_EMAIL }) => {
  // nổ lỗi ngay nếu sai cấu hình SMTP
  await transporter.verify();

  const info = await transporter.sendMail({
    from, // NOTE: với Brevo, from phải là sender đã verify
    to,
    subject,
    html: body,
  });

  // trả về object gọn để hiện ở tab Output của Inngest
  return {
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
    messageId: info.messageId,
  };
};

export default sendEmail;
