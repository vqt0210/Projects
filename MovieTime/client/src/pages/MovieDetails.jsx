import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BlurCircle from "../components/BlurCircle";
import {
  ArrowRightIcon,
  Heart,
  PlayCircleIcon,
  StarIcon,
  XIcon,
} from "lucide-react";
import timeFormat from "../lib/TimeFormat";
import DateSelect from "../components/DateSelect";
import MovieCard from "../components/MovieCard";
import Loading from "../components/Loading";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";

const MovieDetails = () => {
  const navigate = useNavigate();
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState("");
  const { id } = useParams();
  const [show, setShow] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const {
    shows,
    axios,
    getToken,
    user,
    fetchFavoriteMovies,
    favoriteMovies,
    image_base_url,
    setFavoriteMovies,
  } = useAppContext();
  // Lọc ra các movie duy nhất
  const uniqueShows = [
    ...new Map(shows.map((show) => [show.movie._id, show])).values(),
  ];
  useEffect(() => {
    if (showTrailer) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    // cleanup khi component unmount
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showTrailer]);

  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/show/${id}`);
      console.log("API Response:", data); // Log dữ liệu API trả về
      if (data.success) {
        setShow(data);
      } else {
        console.log("No show data found"); // Nếu không có dữ liệu, log lại
      }
    } catch (error) {
      console.log("Error fetching show data:", error); // Log lỗi nếu có
    }
  };
  const handleWatchTrailer = () => {
    if (!show.movie.trailer) {
      toast.error("Trailer not available");
      return;
    }
    setTrailerUrl(show.movie.trailer);
    setShowTrailer(true);
  };

  const handleFavorite = async () => {
    if (!user) return toast.error("Please login to proceed");

    // kiểm tra hiện tại có trong favorites chưa
    const isAlreadyFavorite =
      Array.isArray(favoriteMovies) &&
      favoriteMovies.some((movie) => movie._id === id);

    // cập nhật UI trước (optimistic update)
    let updatedFavorites;
    if (isAlreadyFavorite) {
      updatedFavorites = favoriteMovies.filter((movie) => movie._id !== id);
      setFavoriteMovies(updatedFavorites);
      toast.success("Removed from favorites "); // hiện ngay
    } else {
      updatedFavorites = [...favoriteMovies, { _id: id }];
      setFavoriteMovies(updatedFavorites);
      toast.success("Added to favorites ");
    }
    setFavoriteMovies(updatedFavorites);

    try {
      const { data } = await axios.post(
        "/api/user/update-favorite",
        { movieId: id },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );

      if (!data.success) {
        toast.error("Something went wrong!");
        // rollback lại từ server nếu fail
        fetchFavoriteMovies();
      } else {
        // sync lại với server cho chắc
        fetchFavoriteMovies();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update favorite");
      // rollback nếu fail
      fetchFavoriteMovies();
    }
  };

  useEffect(() => {
    if (id) {
      console.log("Movie ID:", id); // Kiểm tra giá trị id
      getShow();
    } else {
      console.error("Movie ID is undefined or missing in URL");
      toast.error("Invalid Movie ID");
    }
  }, [id]);

  // Kiểm tra nếu show và show.movie tồn tại trước khi sử dụng
  if (!show || !show.movie) {
    return <Loading />; // Nếu show hoặc show.movie chưa có, trả về Loading
  }
  // Kiểm tra nếu show.movie.poster_path tồn tại
  const posterPath = show.movie.poster_path
    ? image_base_url + show.movie.poster_path
    : "/assets/backDropPath.jpg";

  return show ? (
    <div className="px-6 md:px-16 lg:px-40 pt-30 md:pt-50">
      <div className="flex flex-col max-w-6xl gap-8 mx-auto md:flex-row">
        <img
          src={posterPath}
          alt=""
          className="object-cover max-md:mx-auto rounded-xl h-104 max-w-70"
        />

        <div className="relative flex flex-col gap-3">
          <BlurCircle top="-100px" left="-100px" />
          <p className="text-primary">ENGLISH</p>
          <h1 className="text-4xl font-semibold max-w-96 text-balance">
            {show.movie.title}
          </h1>
          <div className="flex items-center gap-2 text-gray-300">
            <StarIcon className="w-5 h-5 text-primary fill-primary" />
            {show.movie.vote_average.toFixed(1)} User Rating
          </div>

          <p className="max-w-xl mt-2 text-sm leading-tight text-gray-400">
            {show.movie.overview}
          </p>
          <p>
            {timeFormat(show.movie.runtime)} •{" "}
            {show.movie.genres.map((genre) => genre.name).join(", ")} •{" "}
            {show.movie.release_date.split("-")[0]}{" "}
            {/*  Hàm split cắt chuỗi thành một mảng, dựa trên ký tự phân cách là "-"; [0]:Lấy phần tử đầu tiên trong mảng vừa tách ra */}
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-4 w-full">
            <button
              onClick={handleWatchTrailer}
              className={`flex items-center justify-center gap-2 py-3 text-sm font-medium transition bg-gray-800 rounded-md cursor-pointer hover:bg-gray-700 active:scale-95 ${
                isExpired ? "px-20 md:px-32" : "px-7"
              }`}
              style={{ flex: isExpired ? "1 1 90%" : "unset" }}
            >
              <PlayCircleIcon className="w-5 h-5" />
              Watch Trailer
            </button>

            {!isExpired && (
              <a
                href="#dateSelect"
                className="px-10 py-3 text-sm font-medium transition rounded-md cursor-pointer bg-primary hover:bg-primary-dull active:scale-95"
              >
                Buy Tickets
              </a>
            )}

            <button
              onClick={handleFavorite}
              className="bg-gray-700 p-2.5 rounded-full transition cursor-pointer active:scale-95"
            >
              <Heart
                className={`w-5 h-5 ${
                  Array.isArray(favoriteMovies) &&
                  favoriteMovies.some((movie) => movie._id === id)
                    ? "fill-primary text-primary"
                    : ""
                }`}
              />
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-12">
        <h2 className="mb-4 text-xl font-semibold">Movie Cast</h2>
        <div className="pb-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-6 px-4 w-max">
            {/*.map duyệt qua từng phần tử trong mảng vừa cắt, index là vị trí của phần tử trong mảng */}
            {show.movie.casts.slice(0, 12).map((cast, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center"
              >
                <img
                  src={image_base_url + cast.profile_path}
                  alt=""
                  className="object-cover w-20 h-20 rounded-full"
                />
                <p className="mt-3 text-xs font-medium">{cast.name}</p>
              </div>
            ))}
          </div>
        </div>

        <DateSelect dateTime={show.dateTime} id={id} onExpired={setIsExpired} />

        <p className="mt-20 mb-8 text-lg font-medium">You May Also Like</p>
        <div className="flex flex-wrap gap-8 max-sm:justify-center">
          {uniqueShows
            .filter(
              (s) =>
                s.movie._id !== show.movie._id && // loại phim hiện tại
                s.movie.genres.some((g) =>
                  show.movie.genres.some((cg) => cg.name === g.name)
                )
            )
            .slice(0, 4) // chỉ lấy 4 phim đầu tiên sau khi lọc
            .map((movie, index) => (
              <MovieCard key={index} movie={movie} />
            ))}
        </div>
        <div className="flex justify-center mt-20">
          <button
            aria-label="Show more movies"
            onClick={() => {
              navigate("/movies");
              scrollTo(0, 0);
            }}
            className="inline-flex items-center justify-center gap-3 px-8 py-3 text-sm font-semibold text-white transition transform rounded-full shadow-lg group bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 hover:brightness-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-400"
            style={{ minWidth: 160 }}
          >
            <span className="select-none">Show more</span>
            <span className="transition-transform duration-300 transform group-hover:translate-x-1">
              <ArrowRightIcon className="w-4 h-4 text-white" />
            </span>
          </button>
        </div>
      </div>

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
              className="absolute right-0 text-2xl font-bold text-white -top-10 cursor-pointer"
            >
              <XIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  ) : (
    <Loading />
  );
};

export default MovieDetails;
