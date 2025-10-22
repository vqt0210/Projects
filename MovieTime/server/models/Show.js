import mongoose from "mongoose";

const showSchema = new mongoose.Schema(
  {
    movie: { type: String, required: true, ref: "Movie" },
    showDateTime: { type: Date, required: true },
    showPrice: { type: Object, default: {} },
    occupiedSeats: { type: Object, default: {} },
    isDeleted: { type: Boolean, default: false },
  },
  { minimize: false, timestamps: true } // thêm timestamps để dễ truy vết
);

//  Soft cascade khi xoá show
showSchema.pre("findOneAndDelete", async function (next) {
  try {
    const showId = this.getQuery()?._id;

    if (showId) {
      const Booking = mongoose.model("Booking");

      // Đánh dấu các booking liên quan là CANCELLED thay vì xóa
      const result = await Booking.updateMany(
        { show: showId },
        {
          $set: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        }
      );

      console.log(
        `[SOFT CASCADE] Marked ${result.modifiedCount} bookings as CANCELLED for show ${showId}`
      );
    }

    next();
  } catch (err) {
    console.error("[SOFT CASCADE ERROR]", err);
    next(err);
  }
});

//  Index giúp query nhanh hơn (lọc show theo movie & ngày)
showSchema.index({ movie: 1 });
showSchema.index({ showDateTime: 1 });

const Show = mongoose.model("Show", showSchema);
export default Show;
