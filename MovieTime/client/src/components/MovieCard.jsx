import { StarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import timeFormat from "../lib/TimeFormat";
import { useAppContext } from "../context/AppContext";

const MovieCard = ({ movie, isUpcoming = false }) => {
  const navigate = useNavigate();
  const { image_base_url } = useAppContext();

  // Kiểm tra và làm phẳng dữ liệu movie (nếu movie có cấu trúc lồng nhau)
  const flattenedMovie = movie && movie.movie ? movie.movie : movie; // Nếu movie bị lồng, làm phẳng ngay

  // Kiểm tra nếu release_date và backdrop_path tồn tại
  const releaseDate =
    flattenedMovie && flattenedMovie.release_date
      ? new Date(flattenedMovie.release_date).getFullYear()
      : "N/A"; // Đặt "N/A" nếu không có release_date
  const backdropPath =
    flattenedMovie && flattenedMovie.backdrop_path
      ? image_base_url + flattenedMovie.backdrop_path
      : "/assets/backDropPath.jpg";
  const genres = Array.isArray(flattenedMovie.genres)
    ? flattenedMovie.genres
        .slice(0, 8)
        .map((genre) => genre.name)
        .join(" | ")
    : "Genres Not Available";
  const runtime = flattenedMovie?.runtime
    ? timeFormat(flattenedMovie.runtime)
    : "Runtime Not Available";

  return (
    <div className="flex flex-col justify-between p-3 bg-gray-800 rounded-2xl hover:-translate-y-1 transition duration-300 w-66">
      <div
        onClick={() => {
          navigate(`/movies/${flattenedMovie._id || flattenedMovie.id}`);
          scrollTo(0, 0);
        }}
        className="relative w-full aspect-[4/3] overflow-hidden rounded-xl"
      >
        <img
          src={backdropPath}
          alt={flattenedMovie.title}
          className="absolute inset-0 w-full h-full object-cover object-center cursor-pointer"
        />
      </div>

      <p className="font-semibold mt-2 truncate">{flattenedMovie.title}</p>
      <p className="text-sm text-gray-400 mt-2">
        {releaseDate} • {genres} • {runtime}{" "}
      </p>

      <div className="flex items-center justify-between mt-4 pb-3">
        {isUpcoming ? (
          <span className="block w-full text-center px-4 py-2 bg-gray-500 rounded-full font-medium">
            Coming Soon
          </span>
        ) : (
          <button
            onClick={() => {
              navigate(`/movies/${flattenedMovie._id || flattenedMovie.id}`);
              scrollTo(0, 0);
            }}
            className="px-4 py-2 text-xs bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
          >
            Buy Tickets
          </button>
        )}
        {!isUpcoming && (
          <p className="flex items-center gap-1 text-sm text-gray-400 mt-1 pr-1">
            <StarIcon className="w-4 h-4 text-primary fill-primary" />
            {flattenedMovie.vote_average?.toFixed(1) ?? "N/A"}
          </p>
        )}
      </div>
    </div>
  );
};

export default MovieCard;
