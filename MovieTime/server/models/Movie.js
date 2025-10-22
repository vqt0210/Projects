import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    overview: { type: String, required: true },
    poster_path: { type: String, required: true },
    backdrop_path: { type: String, required: true },
    release_date: { type: String, required: true },
    original_language: { type: String },
    tagline: { type: String },
    genres: { type: Array, required: true },
    casts: { type: Array, required: true },
    vote_average: { type: Number, required: true },
    runtime: { type: Number, required: true },
    trailer: { type: String, default: null },
  },
  { timestamps: true }
);

// 🧩 Soft Cascade Delete Middleware
movieSchema.pre("findOneAndDelete", async function (next) {
  try {
    const movieId = this.getQuery()?._id;
    if (!movieId) return next();

    const Show = mongoose.model("Show");
    const Booking = mongoose.model("Booking");

    // Lấy tất cả các suất chiếu thuộc movie này
    const shows = await Show.find({ movie: movieId });
    if (!shows.length) {
      console.log(`[CASCADE] No shows found for movie ${movieId}`);
      return next();
    }

    const showIds = shows.map((s) => s._id);

    // Đánh dấu các show là deleted (nếu schema có isDeleted)
    await Show.updateMany(
      { movie: movieId },
      { $set: { isDeleted: true } }
    );

    // Đánh dấu tất cả các booking liên quan là CANCELLED
    const result = await Booking.updateMany(
      { show: { $in: showIds } },
      {
        $set: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
      }
    );

    console.log(
      `[SOFT CASCADE] Marked ${result.modifiedCount} bookings as CANCELLED for movie ${movieId}`
    );

    next();
  } catch (err) {
    console.error("[SOFT CASCADE MOVIE ERROR]", err);
    next(err);
  }
});

const Movie = mongoose.model("Movie", movieSchema);
export default Movie;
