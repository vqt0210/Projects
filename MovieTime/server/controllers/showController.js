import axios from "axios";
import https from "https";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import { inngest } from "../inngest/index.js";
import dns from "dns";

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

const tmdbAgent = new https.Agent({
  rejectUnauthorized: false, // bỏ qua kiểm tra chứng chỉ SSL — cần thiết khi ở mạng công ty có kiểm duyệt HTTPS
  lookup: customLookup,
});
const cache = new Map();
function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}
function cacheSet(key, value, ttl = 5 * 60 * 1000) {
  cache.set(key, { value, expires: Date.now() + ttl });
}

const AXIOS_DEFAULT = {
  timeout: 10_000, // 10s
};
function ensureTmdbKey() {
  const k = process.env.TMDB_API_KEY;
  if (!k) throw new Error("TMDB_API_KEY not configured");
  return k.trim();
}

// API to get now playing movies from TMDB API
export const getNowPlayingMovies = async (req, res) => {
  try {
    const apiKey = ensureTmdbKey();
    const { data } = await axios.get(
      "https://api.tmdb.org/3/movie/now_playing",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: AXIOS_DEFAULT.timeout,
        params: {
          language: "en-US",
        },
        httpsAgent: tmdbAgent,
        proxy: false,
      },
    );
    res.json({ success: true, movies: data.results });
  } catch (error) {
    console.error(
      "getNowPlayingMovies error:",
      error?.response?.data || error?.message || error,
    );
    res.status(502).json({
      success: false,
      message: error?.message || "Failed to fetch TMDB now_playing",
    });
  }
};

// API to add a new show to the database
export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    if (!movieId)
      return res
        .status(400)
        .json({ success: false, message: "movieId required" });

    let movie = await Movie.findById(String(movieId));

    // Nếu phim chưa có trong DB hoặc thiếu trailer → gọi TMDB để lấy
    if (!movie || !movie.trailer || !movie.vote_average) {
      const apiKey = ensureTmdbKey();

      const [movieDetailsResponse, movieCreditsResponse, movieVideosResponse] =
        await Promise.all([
          axios.get(`https://api.tmdb.org/3/movie/${movieId}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: AXIOS_DEFAULT.timeout,
            httpsAgent: tmdbAgent,
          }),
          axios.get(`https://api.tmdb.org/3/movie/${movieId}/credits`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: AXIOS_DEFAULT.timeout,
            httpsAgent: tmdbAgent,
          }),
          axios.get(`https://api.tmdb.org/3/movie/${movieId}/videos`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: AXIOS_DEFAULT.timeout,
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
        _id: movieId,
        title: movieApiData.title,
        overview: movieApiData.overview,
        poster_path: movieApiData.poster_path,
        backdrop_path: movieApiData.backdrop_path,
        genres: movieApiData.genres,
        casts: movieCreditsData.cast,
        release_date: movieApiData.release_date,
        original_language: movieApiData.original_language,
        tagline: movieApiData.tagline || "",
        vote_average: movieApiData.vote_average,
        runtime: movieApiData.runtime,
        trailer: trailer
          ? `https://www.youtube.com/embed/${trailer.key}`
          : null,
      };

      // Cập nhật hoặc tạo mới phim
      if (!movie) {
        movie = await Movie.create(movieDetails);
      } else {
        const updateFields = {};
        if (!movie.trailer) updateFields.trailer = movieDetails.trailer;
        if (!movie.vote_average)
          updateFields.vote_average = movieDetails.vote_average;
        if (Object.keys(updateFields).length > 0) {
          movie = await Movie.findByIdAndUpdate(String(movieId), updateFields, {
            new: true,
          });
        }
      }
    }

    // Kiểm tra show trùng
    const addedShows = [];
    for (const sh of showsInput || []) {
      const localDateTime = new Date(`${sh.date}T${sh.time}:00`);
      const utcDateTime = new Date(localDateTime.toISOString());

      // Check trùng theo movieId + showDateTime
      const exists = await Show.findOne({
        movie: movieId,
        showDateTime: utcDateTime,
      });

      if (exists) {
        console.log(
          `[SKIP] Show already exists for ${movie.title} at ${utcDateTime}`,
        );
        continue; // Bỏ qua nếu trùng
      }

      const newShow = await Show.create({
        movie: movieId,
        showDateTime: utcDateTime,
        showPrice,
        occupiedSeats: {},
      });
      addedShows.push(newShow);
    }

    if (addedShows.length === 0) {
      return res.json({
        success: false,
        message: "Shows already exist, nothing added.",
      });
    }

    // Gửi event Inngest
    await inngest.send({
      name: "app/show.added",
      data: { movieTitle: movie.title },
    });

    res.json({
      success: true,
      message: `Added ${addedShows.length} new show(s).`,
      shows: addedShows,
    });
  } catch (error) {
    console.error("addShow error:", error?.response?.data || error?.message);
    res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
};

// API to get all shows from the database
export const getShows = async (req, res) => {
  try {
    const nowUtc = new Date();

    const shows = await Show.find({ showDateTime: { $gte: nowUtc } })
      .populate("movie")
      .sort({ showDateTime: 1 });

    res.json({ success: true, shows });
  } catch (error) {
    console.error("getShows error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// API to get a single show from the database
export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;
    let movie = null;

    //  Nếu là ObjectId hợp lệ → tìm theo ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(movieId)) {
      movie = await Movie.findById(movieId);
    }

    // Nếu chưa thấy → tìm theo TMDB ID (vd: "507244")
    if (!movie) {
      movie = await Movie.findOne({ _id: movieId });
    }

    // Nếu vẫn không có → thử tìm theo title (trường hợp người dùng click từ /movies/coming-soon/:title)
    if (!movie && isNaN(Number(movieId))) {
      const decodedTitle = decodeURIComponent(movieId);
      movie = await Movie.findOne({
        title: { $regex: decodedTitle, $options: "i" },
      });
    }

    // Nếu vẫn không tìm thấy
    if (!movie) {
      return res
        .status(404)
        .json({ success: false, message: "Movie not found in database" });
    }

    // Lấy danh sách show của phim
    const shows = await Show.find({
      movie: movie._id,
      showDateTime: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    }).sort({ showDateTime: 1 });

    const dateTime = {};
    let showPrice = null;

    for (const s of shows) {
      const date = s.showDateTime.toISOString().split("T")[0];
      if (!dateTime[date]) dateTime[date] = [];
      dateTime[date].push({
        time: s.showDateTime,
        showId: s._id,
        price: s.showPrice,
      });
      if (!showPrice) showPrice = s.showPrice;
    }

    return res.json({
      success: true,
      movie,
      dateTime,
      showPrice: showPrice || 0,
    });
  } catch (error) {
    console.error("getShow error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  New: top-rated & upcoming

export const getTopRatedMovies = async (req, res) => {
  try {
    const minRate = parseFloat(req.query.minRate) || 7;
    const limit = parseInt(req.query.limit) || 10; // top 10
    const movies = await Movie.find({ vote_average: { $gte: minRate } })
      .sort({ vote_average: -1 }) // giảm dần
      .limit(limit);

    res.json({ movies });
  } catch (err) {
    console.error("getTopRatedMovies error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// API: get upcoming movies (filter out movies already in Now Showing)
export const getUpcomingMovies = async (req, res) => {
  try {
    const apiKey = ensureTmdbKey();
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const cacheKey = `tmdb:upcoming:page:${page}`;

    const cached = cacheGet(cacheKey);
    if (cached) return res.json({ success: true, ...cached });

    // Lấy các movie đang showing trong DB
    const nowShowingMovies = await Show.find({}, "movie");
    const nowShowingIds = nowShowingMovies.map((s) => s.movie.toString()); // Lấy danh sách upcoming từ TMDB

    const { data } = await axios.get(
      "https://api.tmdb.org/3/movie/upcoming",
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        params: { language: "en-US", page },
        httpsAgent: tmdbAgent,
      },
    ); // Lọc ra các movie chưa có trong Now Showing

    let filteredResults = data.results.filter(
      (movie) => !nowShowingIds.includes(movie.id.toString()),
    ); // Fetch chi tiết từng movie để lấy genres, runtime, trailer…

    const detailedResults = await Promise.all(
      filteredResults.map(async (movie) => {
        try {
          const { data: detail } = await axios.get(
            `https://api.tmdb.org/3/movie/${movie.id}`,
            {
              headers: { Authorization: `Bearer ${apiKey}` },
              params: { language: "en-US" },
              httpsAgent: tmdbAgent,
            },
          );
          return { ...movie, genres: detail.genres, runtime: detail.runtime };
        } catch {
          return movie; // fallback nếu fetch detail lỗi
        }
      }),
    );

    const payload = {
      page: data.page,
      total_pages: data.total_pages,
      results: detailedResults,
    };

    cacheSet(cacheKey, payload, 5 * 60 * 1000);

    res.json({
      success: true,
      movies: detailedResults,
      page: data.page,
      total_pages: data.total_pages,
    });
  } catch (error) {
    console.error("getUpcomingMovies error:", error);
    res
      .status(502)
      .json({ success: false, message: "Failed to fetch TMDB upcoming" });
  }
};

export const searchMovieByTitle = async (req, res) => {
  try {
    const query = req.query.q || req.query.title;
    if (!query)
      return res
        .status(400)
        .json({ success: false, message: "Missing title query" });

    let movie = null;

    // Nếu query là ObjectId (24 ký tự)
    if (/^[0-9a-fA-F]{24}$/.test(query)) {
      movie = await Movie.findById(query);
    }

    // Nếu query là số (TMDB ID)
    if (!movie && /^\d+$/.test(query)) {
      movie = await Movie.findOne({ _id: query });
    }

    // Nếu vẫn chưa thấy, thử tìm theo title
    if (!movie) {
      movie = await Movie.findOne({
        title: { $regex: query, $options: "i" },
      });
    }

    if (!movie) {
      return res
        .status(404)
        .json({ success: false, message: "Movie not found" });
    }

    return res.status(200).json({ success: true, movie, source: "local" });
  } catch (error) {
    console.error("searchMovieByTitle error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
