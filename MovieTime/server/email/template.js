// Shared Base Layout
const BASE_HEADER = () => `
  <div style="background: linear-gradient(90deg, #0b1220, #1e1b4b); 
              padding: 24px; text-align: center;">
    <h1 style="margin: 0; color: #F84565; font-size: 24px;">
      🎬 MovieTime
    </h1>
    <p style="color: #e5e7eb; font-size: 14px;">
      Your Movie Booking Platform
    </p>
  </div>
`;

const BASE_FOOTER = (supportLink) => `
  <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
    <p style="margin: 0;">MovieTime © ${new Date().getFullYear()}. All rights reserved.</p>
    <p style="margin: 4px 0;">Need help? 
      <a href="${supportLink}" style="color: #F84565; text-decoration: none;">Contact us</a>
    </p>
  </div>
`;

//Booking Confirmation
export const bookingConfirmationEmail = ({
  user,
  movieTitle,
  showDateTime,
  bookedSeats,
  bookingLink,
  supportLink,
  qrImage,
  posterUrl, // ✅ thêm dòng này
}) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
  ${BASE_HEADER()}
  ${
    posterUrl
      ? `<div style="text-align:center; margin-top: 20px;">
          <img src="${posterUrl}" alt="${movieTitle}" style="width: 100%; max-width: 400px; border-radius: 10px; object-fit: cover;"/>
        </div>`
      : ""
  }
  <div style="padding: 24px; color: #111827; line-height: 1.7;">
    <h2 style="color: #F84565;">Hi ${user.name},</h2>
    <p>Your booking for <strong>${movieTitle}</strong> is confirmed! 🎬</p>
    <p><strong>Date:</strong> ${new Date(showDateTime).toLocaleDateString(
      "en-US",
      { timeZone: "Asia/Ho_Chi_Minh" }
    )}</p>
    <p><strong>Time:</strong> ${new Date(showDateTime).toLocaleTimeString(
      "en-US",
      { timeZone: "Asia/Ho_Chi_Minh" }
    )}</p>
    <p><strong>Seats:</strong> ${bookedSeats.join(", ")}</p>

    ${
      qrImage
        ? `<div style="margin-top: 25px; text-align: center;">
             <p style="color: #555; font-size: 14px;">Scan this QR code at the cinema to check in:</p>
             <img src="${qrImage}" alt="Booking QR" style="width: 160px; height: 160px; border-radius: 8px; margin-top: 10px;" />
           </div>`
        : ""
    }

    <div style="margin: 20px 0; text-align: center;">
      <a href="${bookingLink}" style="background: #F84565; color: #fff; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: bold;">
        View Ticket 🎟️
      </a>
    </div>
    <p>Enjoy the show! 🍿</p>
  </div>
  ${BASE_FOOTER(supportLink)}
</div>
`;

// Show Reminder
export const showReminderEmail = ({
  user,
  movieTitle,
  showDateTime,
  bookingLink,
  supportLink,
  posterUrl,
}) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
  ${BASE_HEADER()}
  ${
    posterUrl
      ? `<div style="text-align:center; margin-top: 20px;">
          <img src="${posterUrl}" alt="${movieTitle}" style="width: 100%; max-width: 400px; border-radius: 10px; object-fit: cover;"/>
        </div>`
      : ""
  }
  <div style="padding: 24px; color: #111827; line-height: 1.7;">
    <h2 style="color: #F84565;">Hello ${user.name || "Movie lover"},</h2>
    <p>This is a friendly reminder that your movie:</p>
    <h3 style="color: #F84565;">"${movieTitle}"</h3>
    <p>is scheduled for <strong>${new Date(showDateTime).toLocaleDateString(
      "en-US",
      { timeZone: "Asia/Ho_Chi_Minh" }
    )}</strong> 
    at <strong>${new Date(showDateTime).toLocaleTimeString("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
    })}</strong>.</p>

    <div style="margin: 25px 0; text-align: center;">
      <a href="${bookingLink}" 
         style="background: #F84565; color: #fff; text-decoration: none; 
         padding: 12px 25px; border-radius: 6px; font-weight: bold;">
        View Ticket 🎟️
      </a>
    </div>

    <p>Get ready and enjoy the show! 🍿</p>
  </div>
  ${BASE_FOOTER(supportLink)}
</div>
`;

// Show Time Changed //
export const showTimeChangedEmail = ({
  user,
  movieTitle,
  oldShowDateTime,
  newShowDateTime,
  supportLink,
  posterUrl,
}) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
  ${BASE_HEADER()}
  ${
    posterUrl
      ? `<div style="text-align:center; margin-top: 20px;">
          <img src="${posterUrl}" alt="${movieTitle}" style="width: 100%; max-width: 400px; border-radius: 10px; object-fit: cover;"/>
        </div>`
      : ""
  }
  <div style="padding: 24px; color: #111827; line-height: 1.7;">
    <h2 style="color: #F84565;">Hi ${user.name || "Movie lover"},</h2>
    <p>The showtime for your movie <strong>${movieTitle}</strong> has been updated.</p>

    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p><strong style="color: #6b7280;">Old Showtime:</strong><br>
        <span style="text-decoration: line-through; color: #9ca3af;">
          ${new Date(oldShowDateTime).toLocaleString("en-US", {
            timeZone: "Asia/Ho_Chi_Minh",
          })}
        </span></p>
      <p><strong style="color: #F84565;">New Showtime:</strong><br>
        <span style="font-size: 17px; color: #16a34a; font-weight: bold;">
          ${new Date(newShowDateTime).toLocaleString("en-US", {
            timeZone: "Asia/Ho_Chi_Minh",
          })}
        </span></p>
    </div>

    <p>We apologize for any inconvenience and appreciate your understanding 
      <span style="color:#F84565;">❤️</span>
    </p>
  </div>
  ${BASE_FOOTER(supportLink)}
</div>
`;

// Show Cancellation //
export const cancelShowEmail = ({
  user,
  movieTitle,
  showDateTime,
  supportLink,
}) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
  ${BASE_HEADER()}
  <div style="padding: 24px; color: #111827; line-height: 1.7;">
    <h2 style="color: #F84565;">Hello ${user.name || "Movie lover"},</h2>
    <p>We regret to inform you that your show for <strong>${movieTitle}</strong> has been <strong>canceled</strong>.</p>
    <p><strong>Original Time:</strong> ${new Date(showDateTime).toLocaleString(
      "en-US",
      { timeZone: "Asia/Ho_Chi_Minh" }
    )}</p>
    <p>We sincerely apologize for the inconvenience. Refunds will be processed automatically within 1–3 business days.</p>
    <p>If you have any questions, please <a href="${supportLink}" style="color: #F84565; text-decoration: none;">contact support</a>.</p>
  </div>
  ${BASE_FOOTER(supportLink)}
</div>
`;
