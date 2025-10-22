import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, ref: "User" },
    show: { type: mongoose.Schema.Types.ObjectId, ref: "Show", required: true },
    amount: { type: Number, required: true }, //  Giá sau khi áp dụng giảm giá
    discountValue: { type: Number, default: 0 }, //  % giảm giá (ví dụ 20)
    bookedSeats: { type: Array, required: true },
    isPaid: { type: Boolean, default: false },
    paymentLink: { type: String },
    checkoutSessionId: { type: String },
    status: { type: String, default: "PENDING_PAYMENT" }, // trạng thái booking
    paidAt: { type: Date }, // thời gian thanh toán thành công
    expiresAt: { type: Date }, // thời gian hết hạn (cho job release)
    qrCode: { type: String }, // lưu Base64 QR hoặc URL QR
    ticketCode: { type: String, unique: true }, //mã vé
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
