import { StarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import timeFormat from "@/lib/timeFormat";
import { useAppContext } from "@/context/AppContext";

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
        w-full max-w-[280px] h-[350px]
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
        <p className="text-base font-semibold truncate">
          {flattenedMovie.title}
        </p>
        <p className="mt-1 text-sm text-gray-400 line-clamp-2">
          {releaseDate} • {genres} {runtime && `• ${runtime}`}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pb-2 mt-4">
        {isUpcoming ? (
          <span className="w-full px-4 py-2 text-sm font-medium text-center bg-gray-600 rounded-full">
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
              className="px-4 py-2 text-xs font-medium transition rounded-full cursor-pointer bg-primary hover:bg-primary-dull"
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
