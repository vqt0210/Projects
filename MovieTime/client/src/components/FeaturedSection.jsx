import { ArrowRightIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BlurCircle from "./BlurCircle";
import MovieCard from "./MovieCard";
import { useAppContext } from "../context/AppContext";

const FeaturedSection = () => {
  const navigate = useNavigate();
  const { shows } = useAppContext();
  // Lọc trùng phim, mỗi phim chỉ giữ 1 show đại diện
  const uniqueShows = [
    ...new Map(shows.map((show) => [show.movie._id, show])).values(),
  ];

  return (
    <div className="relative px-6 sm:px-10 md:px-16 lg:px-24 xl:px-32 2xl:px-[12%] overflow-hidden">
      {/* Hiệu ứng Blur background */}
      <BlurCircle top="0" right="-80px" />

      <div className="max-w-screen-xl mx-auto pt-20 pb-10">
        {/* Header: Now Showing + mô tả + View all */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          {/* Left: title + subtitle + count */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
              Now Showing
            </h2>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <span className="hidden sm:inline">
                Latest releases &amp; showtimes
              </span>
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-medium text-gray-100"
                aria-hidden="true"
              >
                {uniqueShows.length} titles
              </span>
            </div>
          </div>

          {/* Right: View all button */}
          <button
            onClick={() => {
              navigate("/movies");
              scrollTo(0, 0);
            }}
            className="group inline-flex items-center gap-3 px-3.5 py-2 rounded-md bg-white/5 hover:bg-white/10 transition"
            aria-label="View all movies"
          >
            <span className="text-sm md:text-base font-medium text-gray-100 cursor-pointer">
              View all
            </span>
            <span className="transform transition-transform duration-300 group-hover:translate-x-1">
              <ArrowRightIcon className="w-4 h-4 text-primary" />
            </span>
          </button>
        </div>

        {/* Grid các phim */}
        <div
          className="grid gap-8 mt-8 
          grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4  
          justify-items-center"
        >
          {uniqueShows.slice(0, 8).map((show) => (
            <MovieCard
              key={`${show._id}-${show.movie._id}`}
              movie={show.movie}
            />
          ))}
        </div>

        {/* Nút Show more */}
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
    </div>
  );
};

export default FeaturedSection;
