// booking confirmation email
export const bookingConfirmationEmail = ({ user, movieTitle, showDateTime, bookedSeats, bookingLink, supportLink }) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #fff; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
  <div style="background: #0b1220; padding: 20px; text-align: center;">
    <h1 style="margin: 0; color: #F84565;">MovieTime</h1>
    <p style="color: #fff; font-size: 14px;">Your Movie Booking Platform</p>
  </div>
  <div style="padding: 20px; color: #0b1220; line-height: 1.5;">
    <h2 style="color: #F84565; margin-top: 0;">Hi ${user.name},</h2>
    <p>Your booking for <strong>${movieTitle}</strong> is confirmed! 🎬</p>
    <p><strong>Date:</strong> ${new Date(showDateTime).toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
    <p><strong>Time:</strong> ${new Date(showDateTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
    <p><strong>Seats:</strong> ${bookedSeats.join(', ')}</p>
    <div style="margin: 20px 0; text-align: center;">
      <a href="${bookingLink}" style="background: #F84565; color: #fff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: bold;">View Booking</a>
    </div>
    <p>Enjoy the show! 🍿</p>
  </div>
  <div style="background: #f0f0f0; padding: 15px; font-size: 12px; text-align: center; color: #666;">
    <p>MovieTime © ${new Date().getFullYear()}. All rights reserved.</p>
    <p>Need help? <a href="${supportLink}" style="color: #F84565; text-decoration: none;">Contact us</a></p>
  </div>
</div>
`;
// show reminder email
export const showReminderEmail = ({ user, movieTitle, showDateTime, supportLink }) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #fff; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
  <div style="background: #0b1220; padding: 20px; text-align: center;">
    <h1 style="margin: 0; color: #F84565;">MovieTime Reminder</h1>
  </div>
  <div style="padding: 20px; color: #0b1220; line-height: 1.5;">
    <h2 style="color: #F84565; margin-top: 0;">Hello ${user.name},</h2>
    <p>This is a friendly reminder that your movie:</p>
    <h3 style="color: #F84565;">"${movieTitle}"</h3>
    <p>is scheduled for <strong>${new Date(showDateTime).toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}</strong> at <strong>${new Date(showDateTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}</strong>.</p>
    <p>Get ready and enjoy the show! 🍿</p>
  </div>
  <div style="background: #f0f0f0; padding: 15px; font-size: 12px; text-align: center; color: #666;">
    <p>MovieTime © ${new Date().getFullYear()}. All rights reserved.</p>
    <p>Need help? <a href="${supportLink}" style="color: #F84565; text-decoration: none;">Contact us</a></p>
  </div>
</div>
`;

