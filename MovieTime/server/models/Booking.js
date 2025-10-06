import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  user: {type: String, required: true, ref: 'User'},
  show: {type: String, required: true, ref: 'Show'},
  amount: {type: Number, required: true},
  bookedSeats: {type: Array, required: true},
  isPaid: {type: Boolean, default: false},
  paymentLink: {type: String},
  checkoutSessionId: { type: String },
  status: { type: String, default: "PENDING_PAYMENT" }, // lưu trạng thái booking
  paidAt: { type: Date },                               // thời gian thanh toán thành công
  expiresAt: { type: Date },                            // thời gian hết hạn (cho job release)
},{timestamps: true})

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;