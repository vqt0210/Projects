import Booking from "../models/Booking.js";

export const getTicketById = async (req, res) => {
  try {
    const bookingId = req.params.id.trim();
    const { userId } = req.auth();


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


    // Kiểm tra quyền sở hữu vé
    if (booking.userId?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized — this ticket doesn’t belong to you.",
      });
    }

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
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
