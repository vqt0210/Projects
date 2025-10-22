import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, ref: "User" },
    show: { type: mongoose.Schema.Types.ObjectId, ref: "Show", required: true },

    // Giá vé
    amount: { type: Number, required: true }, // giá sau khi áp dụng giảm giá
    discountValue: { type: Number, default: 0 }, // % giảm giá (ví dụ 20)

    // Thông tin ghế
    bookedSeats: {
      type: [String],
      required: true,
      validate: [(v) => v.length > 0, "At least one seat must be booked."],
    },

    // Thanh toán
    isPaid: { type: Boolean, default: false },
    paymentLink: { type: String },
    checkoutSessionId: { type: String },
    paidAt: { type: Date },

    // Trạng thái & thời gian
    status: {
      type: String,
      enum: ["PENDING", "PENDING_PAYMENT", "PAID", "CONFIRMED", "EXPIRED", "CANCELLED"],
      default: "PENDING",
    },
    expiresAt: { type: Date }, // thời gian hết hạn (cho job release)
    cancelledAt: { type: Date, default: null },

    // Vé & QR
    qrCode: { type: String }, // lưu Base64 QR hoặc URL QR
    ticketCode: {
      type: String,
      unique: true,
      required: true,
      default: () => `MT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    },

    // Metadata
    paymentIntentId: { type: String },
  },
  { timestamps: true }
);

// Index cho nhanh (lọc nhanh theo user hoặc show)
bookingSchema.index({ userId: 1 });
bookingSchema.index({ show: 1 });

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
