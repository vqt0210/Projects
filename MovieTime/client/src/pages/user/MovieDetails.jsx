import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BlurCircle from "@/components/common/BlurCircle";
import { Heart, PlayCircleIcon, StarIcon, XIcon } from "lucide-react";
import Loading from "@/components/common/Loading";
import DateSelect from "@/components/admin/utils/DateSelect";
import timeFormat from "@/lib/timeFormat";
import { useAppContext } from "@/context/AppContext";
import toast from "react-hot-toast";
import api from "@/utils/api";

const MovieDetails = () => {
  const navigate = useNavigate();
  const { id, title } = useParams(); //  lấy cả id và title (cho coming-soon)
  const [show, setShow] = useState(null);
  const [tmdbMovie, setTmdbMovie] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState("");
  const { user, favoriteMovies, toggleFavorite } = useAppContext();

  // Trước đây gọi thẳng https://api.themoviedb.org từ trình duyệt — đổi
  // sang gọi qua backend proxy (/api/tmdb/...) để tránh lỗi DNS/kết nối
  // trên một số mạng, `api` (axios
  // instance) đã có sẵn baseURL trỏ về server, nên chỉ cần đổi TMDB_BASE.
  const TMDB_BASE = "/api/tmdb";
  const languageMap = {
    en: "English",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
    fr: "French",
    es: "Spanish",
    de: "German",
    it: "Italian",
    th: "Thai",
    vi: "Vietnamese",
  };

  const getShow = async () => {
    try {
      let foundShow = null;

      //  Nếu có id Mongo hợp lệ → lấy từ DB
      if (id && /^[0-9a-fA-F]{24}$/.test(id)) {
        const { data } = await api.get(`/api/show/${id}`);
        if (data.success && data.movie) {
          foundShow = data;
        }
      }

      // Nếu không có id hoặc không tìm thấy → thử tìm trong DB theo title.
      // validateStatus: không throw cho 404 — phim chưa có trong DB là bình thường.
      if (!foundShow && (title || id)) {
        const movieName = decodeURIComponent(title || id);
        const { data } = await api.get(`/api/show/search`, {
          params: { q: movieName },
          validateStatus: (status) => status < 500,
        });

        if (data.success && data.movie?._id) {
          // Nếu có trong DB → lấy luôn show chính xác
          const showData = await api.get(`/api/show/${data.movie._id}`);
          if (showData.data.success && showData.data.movie) {
            foundShow = showData.data;
          }
        }
      }

      // Nếu vẫn không tìm thấy → fallback TMDB
      if (!foundShow) {
        const movieName = decodeURIComponent(title || id || "");
        if (!movieName || movieName.trim() === "") {
          toast.error("Invalid movie title");
          return;
        }
        await fetchFromTMDB(movieName);
        return;
      }

      //  Nếu tìm thấy trong DB
      setShow(foundShow);
    } catch (err) {
      console.warn("Error fetching show:", err);
      const movieName = decodeURIComponent(title || id || "");
      await fetchFromTMDB(movieName);
    }
  };

  // Lấy dữ liệu từ TMDB (Coming Soon)
  const fetchFromTMDB = async (movieName) => {
    try {
      if (!movieName || movieName === "undefined") {
        toast.error("Invalid movie name");
        return;
      }

      console.log(`[COMING SOON] Fetching from TMDB for "${movieName}"...`);

      let movie = null;

      // Nếu movieName là số ID TMDB -> fetch trực tiếp
      if (!isNaN(Number(movieName))) {
        const res = await api.get(`${TMDB_BASE}/movie/${movieName}`);
        movie = res.data;
      } else {
        // Nếu movieName là tên -> search theo tên
        const search = await api.get(`${TMDB_BASE}/search/movie`, {
          params: { query: decodeURIComponent(movieName) },
        });
        movie = search.data.results?.[0];
      }

      if (!movie) {
        toast.error("Movie not found on TMDB");
        return;
      }

      // Lấy thêm thông tin chi tiết (runtime, genres, release_date)
      const { data: details } = await api.get(`${TMDB_BASE}/movie/${movie.id}`);

      // Gộp dữ liệu chi tiết vào movie
      movie.runtime = details.runtime;
      movie.genres = details.genres;
      movie.release_date = details.release_date;
      movie.original_language =
        languageMap[details.original_language] || "Unknown";

      // 🎬 Lấy trailer + cast song song
      const [videos, credits] = await Promise.all([
        api.get(`${TMDB_BASE}/movie/${movie.id}/videos`),
        api.get(`${TMDB_BASE}/movie/${movie.id}/credits`),
      ]);

      movie.videos = videos.data.results;
      movie.casts = credits.data.cast?.slice(0, 12) || [];

      setTmdbMovie(movie);
    } catch (err) {
      console.error("TMDB fetch failed:", err);
      toast.error("Failed to fetch from TMDB");
    }
  };

  useEffect(() => {
    getShow();
  }, [id, title]);

  // Favorite
  const targetMovieId = show?.movie?._id || (tmdbMovie?.id ? String(tmdbMovie.id) : null);
  const targetMovieObj = show?.movie || (tmdbMovie ? { ...tmdbMovie, _id: String(tmdbMovie.id) } : null);

  const handleFavorite = async () => {
    if (!user) return toast.error("Please login to proceed");
    if (!targetMovieId || !targetMovieObj) return toast.error("Invalid movie details");
    await toggleFavorite(targetMovieId, targetMovieObj);
  };

  // Trailer
  const handleWatchTrailer = () => {
    const trailer =
      show?.movie?.trailer ||
      tmdbMovie?.videos?.find(
        (v) => v.type === "Trailer" && v.site === "YouTube",
      )?.key;

    console.log("TRAILER:", trailer);

    if (!trailer) {
      return toast.error("Trailer not available");
    }

    // Nếu đã là URL thì dùng luôn
    if (trailer.startsWith("http")) {
      setTrailerUrl(trailer);
    } else {
      // Nếu là YouTube video key từ TMDB
      setTrailerUrl(`https://www.youtube.com/embed/${trailer}`);
    }

    setShowTrailer(true);
  };

  if (!show && !tmdbMovie) return <Loading />;

  // Phân loại phim
  const movie = show?.movie || tmdbMovie;
  const isComingSoon = !show?.movie && tmdbMovie;

  // Poster Path
  const posterPath = movie.poster_path
    ? `https://image.tmdb.org/t/p/original${movie.poster_path}`
    : "/assets/backDropPath.jpg";

  // Render chính
  return (
    <div className="px-6 md:px-16 lg:px-40 pt-30 md:pt-50">
      {/* Thông tin chính */}
      <div className="flex flex-col max-w-6xl gap-8 mx-auto md:flex-row">
        <img
          src={posterPath}
          alt={movie.title}
          className="object-cover max-md:mx-auto rounded-xl h-104 max-w-70"
        />
        <div className="relative flex flex-col gap-3">
          <BlurCircle top="-100px" left="-100px" />
          <p className="font-bold uppercase text-primary">
            {movie.original_language || "Unknown"}
          </p>
          <h1 className="text-4xl font-semibold max-w-96 text-balance">
            {movie.title}
          </h1>
          <div className="flex items-center gap-2 text-gray-300">
            <StarIcon className="w-5 h-5 text-primary fill-primary" />
            {movie.vote_average?.toFixed(1) || "?"} User Rating
          </div>
          <p className="max-w-xl mt-2 text-sm leading-tight text-gray-400">
            {movie.overview || "No overview available."}
          </p>
          <p>
            {movie.runtime ? timeFormat(movie.runtime) : "?"} •{" "}
            {movie.genres?.map((g) => g.name).join(", ") || "Unknown"} •{" "}
            {movie.release_date?.split("-")[0] || "N/A"}
          </p>

          {/* Nút hành động */}
          <div className="flex flex-wrap items-center w-full gap-4 mt-4">
            <button
              onClick={handleWatchTrailer}
              className="flex items-center justify-center gap-2 py-3 text-sm font-medium transition bg-gray-800 rounded-full shadow-md cursor-pointer hover:bg-gray-700 px-7"
            >
              <PlayCircleIcon className="w-5 h-5" />
              Watch Trailer
            </button>

            {/* Nếu chưa có trong DB → Coming Soon */}
            {isComingSoon ? (
              <div className="px-8 py-3 text-sm font-medium text-yellow-400 rounded-full bg-yellow-400/10">
                🎬 Coming Soon
              </div>
            ) : !isExpired ? (
              <a
                href="#dateSelect"
                className="px-10 py-3 text-sm font-medium transition rounded-full shadow-md cursor-pointer bg-primary hover:bg-primary-dull active:scale-95"
              >
                Buy Tickets
              </a>
            ) : (
              <div className="px-8 py-3 text-sm font-medium text-red-400 rounded-full bg-red-400/10">
                🎟 No Showtime Available
              </div>
            )}

            <button
              onClick={handleFavorite}
              className="bg-gray-700 p-2.5 rounded-full transition cursor-pointer active:scale-95"
            >
              <Heart
                className={`w-5 h-5 ${
                  Array.isArray(favoriteMovies) &&
                  targetMovieId &&
                  favoriteMovies.some((m) => m._id === targetMovieId)
                    ? "fill-primary text-primary"
                    : ""
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Movie Cast */}
      {(show?.movie?.casts || tmdbMovie?.casts) && (
        <div className="max-w-6xl mx-auto mt-12">
          <h2 className="mb-4 text-xl font-semibold">Movie Cast</h2>

          <div
            className="flex gap-4 pb-4 overflow-x-auto whitespace-nowrap scroll-smooth scrollbar-hide"
            style={{ scrollBehavior: "smooth" }}
          >
            <div className="flex items-center gap-6 px-4 w-max">
              {(show?.movie?.casts || tmdbMovie?.casts)?.map((cast, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center text-center cursor-pointer min-w-[90px] transition-transform duration-300 hover:scale-110"
                  onClick={() => {
                    if (cast.id) navigate(`/actors/${cast.id}`);
                    scrollTo(0, 0);
                  }}
                >
                  <img
                    src={
                      cast.profile_path
                        ? `https://image.tmdb.org/t/p/w200${cast.profile_path}`
                        : "/assets/profile_pic.jpg"
                    }
                    alt={cast.name}
                    className="object-cover w-20 h-20 transition-all duration-300 border rounded-full shadow-md border-white/10 hover:border-primary"
                    onError={(e) => (e.target.src = "/assets/profile_pic.jpg")}
                  />
                  <p className="mt-3 text-xs font-medium text-gray-300 truncate w-[80px] hover:text-primary">
                    {cast.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Nếu có suất chiếu → hiện DateSelect */}
      {!isComingSoon && (
        <div id="dateSelect" className="max-w-6xl mx-auto mt-12">
          {show?.dateTime && Object.keys(show.dateTime).length > 0 ? (
            <DateSelect
              dateTime={show.dateTime}
              id={id}
              onExpired={setIsExpired}
            />
          ) : (
            <div className="p-8 text-center border rounded-lg bg-primary/10 border-primary/20">
              <p className="text-lg font-medium text-red-400">
                🎟 No Showtime Available
              </p>
              <p className="text-sm text-gray-400">
                All showtimes are sold out.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Trailer Modal */}
      {showTrailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="relative w-[90%] md:w-[60%] aspect-video">
            <iframe
              src={`${trailerUrl}?autoplay=1`}
              title="Trailer"
              allow="autoplay; encrypted-media"
              allowFullScreen
              className="w-full h-full rounded-lg"
            />
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute right-0 text-2xl font-bold text-white cursor-pointer -top-10"
            >
              <XIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieDetails;
