import axios from "axios";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import { inngest } from "../inngest/index.js";

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
      "https://api.themoviedb.org/3/movie/now_playing",
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: AXIOS_DEFAULT.timeout,
        params: { language: "en-US" },
      }
    );

    res.json({ success: true, movies: data.results });
  } catch (error) {
    console.error(
      "getNowPlayingMovies error:",
      error?.response?.data || error?.message || error
    );
    res
      .status(502)
      .json({
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

    if (
      !movie ||
      movie.trailer == null ||
      movie.trailer === "" ||
      movie.trailer === "null" ||
      typeof movie.trailer === "undefined"
    ) {
      // ensure key
      const apiKey = ensureTmdbKey();

      // Fetch details, credits, videos in parallel
      const [movieDetailsResponse, movieCreditsResponse, movieVideosResponse] =
        await Promise.all([
          axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: AXIOS_DEFAULT.timeout,
          }),
          axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: AXIOS_DEFAULT.timeout,
          }),
          axios.get(`https://api.themoviedb.org/3/movie/${movieId}/videos`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: AXIOS_DEFAULT.timeout,
          }),
        ]);

      const movieApiData = movieDetailsResponse.data;
      const movieCreditsData = movieCreditsResponse.data;
      const movieVideosData = movieVideosResponse.data;

      let trailer = movieVideosData.results.find(
        (vid) =>
          vid.type === "Trailer" && vid.site === "YouTube" && vid.official
      );
      if (!trailer) {
        trailer = movieVideosData.results.find(
          (vid) => vid.type === "Trailer" && vid.site === "YouTube"
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

      // Add or update movie
      if (!movie) {
        movie = await Movie.create(movieDetails);
      } else if (!movie.trailer) {
        movie = await Movie.findByIdAndUpdate(
          String(movieId),
          { trailer: movieDetails.trailer },
          { new: true }
        );
      }
    }

    const showsToCreate = [];
    (showsInput || []).forEach((sh) => {
      const showDate = sh.date;
      const time = sh.time;
      const dateTimeString = `${showDate}T${time}`;
      showsToCreate.push({
        movie: movieId,
        showDateTime: new Date(dateTimeString),
        showPrice,
        occupiedSeats: {},
      });
    });

    if (showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
    }

    await inngest.send({
      name: "app/show.added",
      data: { movieTitle: movie.title },
    });

    res.json({ success: true, message: "Show Added Successfully" });
  } catch (error) {
    console.error(
      "addShow error:",
      error?.response?.data || error?.message || error
    );
    res
      .status(500)
      .json({
        success: false,
        message: error?.message || "Internal server error",
      });
  }
};

// API to get all shows from the database
export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
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

    // Tìm movie
    const movie =
      (await Movie.findById(String(movieId))) ||
      (await Movie.findOne({ _id: movieId })) ||
      (await Movie.findOne({ id: Number(movieId) }));

    if (!movie) {
      return res
        .status(404)
        .json({ success: false, message: "Movie not found in database" });
    }

    // Lấy danh sách show của phim đó
    const shows = await Show.find({
      movie: movie._id,
      showDateTime: { $gte: new Date() },
    }).sort({ showDateTime: 1 });

    const dateTime = {};
    let showPrice = null;

    for (const s of shows) {
      const date = s.showDateTime.toISOString().split("T")[0];
      if (!dateTime[date]) dateTime[date] = [];
      dateTime[date].push({
        time: s.showDateTime,
        showId: s._id,
        price: s.showPrice, //  Gửi giá vé ra frontend
      });

      // Gán giá của show đầu tiên làm mặc định
      if (!showPrice) showPrice = s.showPrice;
    }

    return res.json({
      success: true,
      movie,
      dateTime,
      showPrice: showPrice || 0, //  gửi giá vé chung
    });
  } catch (error) {
    console.error("getShow error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  New: top-rated & upcoming

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
    const nowShowingIds = nowShowingMovies.map((s) => s.movie.toString());

    // Lấy danh sách upcoming từ TMDB
    const { data } = await axios.get(
      "https://api.themoviedb.org/3/movie/upcoming",
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        params: { language: "en-US", page },
      }
    );

    // Lọc ra các movie chưa có trong Now Showing
    let filteredResults = data.results.filter(
      (movie) => !nowShowingIds.includes(movie.id.toString())
    );

    // Fetch chi tiết từng movie để lấy genres, runtime, trailer…
    const detailedResults = await Promise.all(
      filteredResults.map(async (movie) => {
        try {
          const { data: detail } = await axios.get(
            `https://api.themoviedb.org/3/movie/${movie.id}`,
            {
              headers: { Authorization: `Bearer ${apiKey}` },
              params: { language: "en-US" },
            }
          );
          return { ...movie, genres: detail.genres, runtime: detail.runtime };
        } catch {
          return movie; // fallback nếu fetch detail lỗi
        }
      })
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
