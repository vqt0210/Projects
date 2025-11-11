import { clerkClient, verifyToken } from "@clerk/express";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";

// ================== BOOKINGS ==================

// API Controller Function to Get User Bookings
export const getUserBookings = async (req, res) => {
  try {
    const { userId } = req.auth();

    const bookings = await Booking.find({ userId })
      .populate({
        path: "show",
        populate: { path: "movie" },
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    next(error);
  }
};

// ================== FAVORITES ==================

// Toggle Favorite Movie in Clerk User Metadata
export const updateFavorite = async (req, res) => {
  try {
    const { movieId } = req.body;
    const { userId } = req.auth();

    const user = await clerkClient.users.getUser(userId);

    // Nếu chưa có favorites thì khởi tạo
    if (!user.privateMetadata.favorites) {
      user.privateMetadata.favorites = [];
    }

    let message = "";
    if (!user.privateMetadata.favorites.includes(movieId)) {
      // Thêm vào danh sách
      user.privateMetadata.favorites.push(movieId);
      message = "Favorite added successfully";
    } else {
      // Xoá khỏi danh sách
      user.privateMetadata.favorites = user.privateMetadata.favorites.filter(
        (item) => item !== movieId
      );
      message = "Favorite removed successfully";
    }

    // Cập nhật metadata lên Clerk
    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: user.privateMetadata,
    });

    res.json({ success: true, message });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Get All Favorite Movies of a User
export const getFavorites = async (req, res) => {
  try {
    const { userId } = req.auth();
    const user = await clerkClient.users.getUser(userId);

    const favorites = user.privateMetadata.favorites || [];

    // Lấy movie details từ DB
    const movies = await Movie.find({ _id: { $in: favorites } });

    res.json({ success: true, movies });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};
// =============== FAVORITES SYNC ===============

export const syncFavorites = async (req, res) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ success: false, message: "Missing Authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // Xác thực token
    const { sub: userId } = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    console.log("[SYNC FAVORITES] User:", userId);

    const user = await clerkClient.users.getUser(userId);
    const favorites = user.privateMetadata.favorites || [];

    const movies = await Movie.find({ _id: { $in: favorites } });
    const validIds = movies.map((m) => m._id.toString());
    const invalidIds = favorites.filter((id) => !validIds.includes(id));

    if (invalidIds.length > 0) {
      console.log("Removing invalid favorites:", invalidIds);
      user.privateMetadata.favorites = validIds;
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: user.privateMetadata,
      });
    }

    res.json({ success: true, movies });
  } catch (error) {
    console.error("[SYNC FAVORITES ERROR]:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
