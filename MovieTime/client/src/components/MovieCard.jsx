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
    <div
      className="
        group flex flex-col justify-between bg-gray-800 
        rounded-2xl p-3 
        w-full max-w-[270px] md:max-w-[280px] xl:max-w-[300px]
        transition-transform duration-300 hover:scale-[1.05] hover:-translate-y-1
        shadow-md hover:shadow-primary/30
      "
      onClick={() => {
        if (isUpcoming) return;
        navigate(`/movies/${flattenedMovie._id || flattenedMovie.id}`);
        scrollTo(0, 0);
      }}
    >
      {/* Poster */}
      <div className="relative w-full aspect-[4/3] overflow-hidden rounded-xl">
        <img
          src={backdropPath}
          alt={flattenedMovie.title}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110 ${
            isUpcoming ? "cursor-default" : "cursor-pointer"
          }`}
        />
      </div>

      {/* Thông tin */}
      <div className="flex flex-col flex-grow mt-3">
        <p className="font-semibold truncate text-base">
          {flattenedMovie.title}
        </p>
        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
          {releaseDate} • {genres} {runtime && `• ${runtime}`}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pb-2">
        {isUpcoming ? (
          <span className="w-full text-center px-4 py-2 bg-gray-600 rounded-full font-medium text-sm">
            Coming Soon
          </span>
        ) : (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation(); // tránh bị trigger onClick toàn card
                navigate(`/movies/${flattenedMovie._id || flattenedMovie.id}`);
                scrollTo(0, 0);
              }}
              className="px-4 py-2 text-xs bg-primary hover:bg-primary-dull transition rounded-full font-medium"
            >
              Buy Tickets
            </button>
            <p className="flex items-center gap-1 text-sm text-gray-300">
              <StarIcon className="w-4 h-4 text-primary fill-primary" />
              {flattenedMovie.vote_average?.toFixed(1) ?? "N/A"}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default MovieCard;
