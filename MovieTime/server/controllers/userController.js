import { clerkClient, verifyToken } from "@clerk/express";
import axios from "axios";
import https from "https";
import dns from "dns";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";

const customLookup = (hostname, options, callback) => {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return dns.lookup(hostname, options, callback);
  }
  dns.resolve4(hostname, (err, addresses) => {
    if (err || !addresses || addresses.length === 0) {
      return dns.lookup(hostname, options, callback);
    }
    if (options && options.all) {
      return callback(null, addresses.map(ip => ({ address: ip, family: 4 })));
    }
    return callback(null, addresses[0], 4);
  });
};

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

    if (!movieId) {
      return res.status(400).json({ success: false, message: "movieId is required" });
    }

    const user = await clerkClient.users.getUser(userId);

    // Nếu chưa có favorites thì khởi tạo
    if (!user.privateMetadata.favorites) {
      user.privateMetadata.favorites = [];
    }

    // Nếu phim chưa có trong DB, tự động lấy dữ liệu từ TMDB và tạo phim
    let movie = await Movie.findById(String(movieId));
    if (!movie && !user.privateMetadata.favorites.includes(movieId)) {
      const apiKey = process.env.TMDB_API_KEY?.trim();
      if (apiKey) {
        try {
          const tmdbAgent = new https.Agent({
            rejectUnauthorized: false,
            lookup: customLookup,
          });
          const [movieDetailsResponse, movieCreditsResponse, movieVideosResponse] =
            await Promise.all([
              axios.get(`https://api.tmdb.org/3/movie/${movieId}`, {
                headers: { Authorization: `Bearer ${apiKey}` },
                timeout: 10000,
                httpsAgent: tmdbAgent,
              }),
              axios.get(`https://api.tmdb.org/3/movie/${movieId}/credits`, {
                headers: { Authorization: `Bearer ${apiKey}` },
                timeout: 10000,
                httpsAgent: tmdbAgent,
              }),
              axios.get(`https://api.tmdb.org/3/movie/${movieId}/videos`, {
                headers: { Authorization: `Bearer ${apiKey}` },
                timeout: 10000,
                httpsAgent: tmdbAgent,
              }),
            ]);

          const movieApiData = movieDetailsResponse.data;
          const movieCreditsData = movieCreditsResponse.data;
          const movieVideosData = movieVideosResponse.data;

          let trailer = movieVideosData.results.find(
            (vid) =>
              vid.type === "Trailer" && vid.site === "YouTube" && vid.official,
          );
          if (!trailer) {
            trailer = movieVideosData.results.find(
              (vid) => vid.type === "Trailer" && vid.site === "YouTube",
            );
          }

          const movieDetails = {
            _id: String(movieId),
            title: movieApiData.title,
            overview: movieApiData.overview || "No overview available.",
            poster_path: movieApiData.poster_path || "",
            backdrop_path: movieApiData.backdrop_path || "",
            genres: movieApiData.genres || [],
            casts: movieCreditsData.cast || [],
            release_date: movieApiData.release_date || "",
            original_language: movieApiData.original_language || "",
            tagline: movieApiData.tagline || "",
            vote_average: movieApiData.vote_average || 0,
            runtime: movieApiData.runtime || 0,
            trailer: trailer
              ? `https://www.youtube.com/embed/${trailer.key}`
              : null,
          };

          movie = await Movie.create(movieDetails);
          console.log(`[FAVORITE] Automatically created movie: ${movie.title} (${movieId})`);
        } catch (tmdbError) {
          console.error(`[FAVORITE] Error fetching/creating movie ${movieId} from TMDB:`, tmdbError.message);
        }
      }
    }

    let message = "";
    if (!user.privateMetadata.favorites.includes(movieId)) {
      // Thêm vào danh sách
      user.privateMetadata.favorites.push(movieId);
      message = "Favorite added successfully";
    } else {
      // Xoá khỏi danh sách
      user.privateMetadata.favorites = user.privateMetadata.favorites.filter(
        (item) => item !== movieId,
      );
      message = "Favorite removed successfully";
    }

    // Cập nhật metadata lên Clerk
    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: user.privateMetadata,
    });

    // Trả luôn danh sách phim yêu thích mới nhất trong CÙNG 1 response,
    // để frontend không cần gọi thêm request sync-favorites riêng. Việc gộp lại
    // giảm 1 network round-trip + 1 lần gọi Clerk API mỗi lần bấm tim.
    const movies = await Movie.find({
      _id: { $in: user.privateMetadata.favorites },
    });

    res.json({ success: true, message, movies });
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
