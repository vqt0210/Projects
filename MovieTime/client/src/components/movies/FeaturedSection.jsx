import { ArrowRightIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BlurCircle from "@/components/common/BlurCircle";
import MovieCard from "@/components/movies/MovieCard";
import { useAppContext } from "@/context/AppContext";
import { useEffect } from "react";

const FeaturedSection = () => {
  const navigate = useNavigate();
  const { shows, fetchShows } = useAppContext();

  // Gọi API lần đầu + tự refresh mỗi 60s
  useEffect(() => {
    console.log("Fetching shows...");
    fetchShows();

    const interval = setInterval(() => {
      console.log("Auto-refreshing shows...");
      fetchShows();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  //  CHUẨN HÓA THEO UTC 
  const now = new Date();

  // Lọc show còn hiệu lực (so sánh UTC)
  const validShows = shows.filter((show) => {
    const showTime = new Date(show.showDateTime);
    const isValid = showTime > now;
    console.log(
      `🎬 [${show.movie.title}] — showTime=${showTime.toISOString()}, now=${now.toISOString()}, valid=${isValid}`
    );
    return isValid;
  });

  // Lọc trùng phim, mỗi phim chỉ giữ 1 show đại diện
  const uniqueShows = [
    ...new Map(validShows.map((show) => [show.movie._id, show])).values(),
  ];

  console.log(`Total valid shows: ${uniqueShows.length}`);

  return (
    <div className="relative px-6 sm:px-10 md:px-16 lg:px-24 xl:px-32 2xl:px-[12%] overflow-hidden">
      <BlurCircle top="0" right="-80px" />
      <div className="max-w-screen-xl pt-20 pb-10 mx-auto">
        {/* Header */}
        <div className="flex flex-col justify-between gap-6 mb-6 md:flex-row md:items-center">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Now Showing
            </h2>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <span className="hidden sm:inline">
                Latest releases &amp; showtimes
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/10 text-xs font-medium text-gray-100">
                {uniqueShows.length} titles
              </span>
            </div>
          </div>

          {/* View all */}
          <button
            onClick={() => {
              navigate("/movies");
              scrollTo(0, 0);
            }}
            className="group inline-flex items-center gap-3 px-3.5 py-2 rounded-md bg-white/5 hover:bg-white/10 transition cursor-pointer"
          >
            <span className="text-sm font-medium text-gray-100 md:text-base">
              View all
            </span>
            <ArrowRightIcon className="w-4 h-4 transition-transform duration-300 transform text-primary group-hover:translate-x-1" />
          </button>
        </div>

        {/* Grid phim */}
        <div className="grid grid-cols-1 gap-8 mt-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 justify-items-center">
          {uniqueShows.slice(0, 8).map((show) => (
            <MovieCard key={`${show._id}-${show.movie._id}`} movie={show.movie} />
          ))}
        </div>

        {/* Show more */}
        <div className="flex justify-center mt-20">
          <button
            onClick={() => {
              navigate("/movies");
              scrollTo(0, 0);
            }}
            className="inline-flex items-center justify-center gap-3 px-8 py-3 text-sm font-semibold text-white transition transform rounded-full shadow-lg group bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 hover:brightness-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-400"
            style={{ minWidth: 160 }}
          >
            <span className="select-none">Show more</span>
            <ArrowRightIcon className="w-4 h-4 text-white transition-transform duration-300 transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeaturedSection;
