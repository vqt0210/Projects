import Booking from "../models/Booking.js";

export const getTicketById = async (req, res) => {
  try {
    const bookingId = req.params.id.trim();
    const booking = await Booking.findById(bookingId)
      .populate({
        path: "show",
        populate: { path: "movie" },
      })
      .lean();
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }
    console.log("[DEBUG] Fetching booking:", req.params.id);

    const movie = booking.show.movie;

    res.json({
      success: true,
      ticket: {
        id: booking._id,
        movieTitle: movie.title,
        moviePoster: movie.poster_path,
        showDateTime: booking.show.showDateTime,
        seats: booking.bookedSeats,
        amount: booking.amount,
        status: booking.status,
        qrCode: booking.qrCode,
      },
    });
  } catch (error) {
    console.error("[TICKET] Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
