import MovieCard from "@/components/movies/MovieCard";
import BlurCircle from "@/components/common/BlurCircle";
import { useAppContext } from "@/context/AppContext";
import Loading from "@/components/common/Loading";
import { useEffect, useState } from "react";
export default function TopRated() {
  const { shows } = useAppContext();
  const [loading, setLoading] = useState(true);

  const positions = [
    { top: "100px", left: "50px" },
    { top: "400px", right: "150px" },
    { top: "800px", left: "200px" },
    { bottom: "300px", right: "100px" },
    { top: "1200px", left: "100px" },
  ];

  // Khi shows được load (hoặc thay đổi)
  useEffect(() => {
    if (Array.isArray(shows) && shows.length > 0) {
      setLoading(false);
    }
  }, [shows]);

  // loading
  if (loading) {
    return <Loading message="Đang tải danh sách Top Rated..." />;
  }

  // Nếu shows chưa có hoặc rỗng
  if (!Array.isArray(shows) || shows.length === 0)
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-3xl font-bold text-center">No movies available</h1>
      </div>
    );

  // Lọc trùng movie theo _id
  const uniqueShows = [
    ...new Map(
      shows
        .filter((show) => show.movie?._id)
        .map((show) => [show.movie._id, show])
    ).values(),
  ];

  const movies = uniqueShows.map((show) => show.movie);

  // Sort top rated (lọc các movie có vote_average hợp lệ)
  const topRatedMovies = movies
    .filter((m) => typeof m.vote_average === "number")
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 10);

  return topRatedMovies.length > 0 ? (
    <div className="relative pt-32 md:pt-36 pb-40 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]">
      {/* Hiệu ứng Blur background */}
      {positions.map((pos, i) => (
        <BlurCircle key={i} {...pos} />
      ))}

      <div className="max-w-screen-xl mx-auto">
        {/* Tiêu đề section */}
        <h1 className="my-6 text-2xl font-semibold text-center md:text-left">
          Top Rated
        </h1>

        {/* Danh sách phim */}
        <div className="grid items-stretch gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 justify-items-stretch">
          {topRatedMovies.map((movie, i) => (
            <div
              key={movie._id || i}
              className="relative group w-full max-w-[280px] h-full flex flex-col"
            >
              <span className="absolute z-20 px-3 py-1 text-xs font-bold text-white rounded-full shadow-md top-2 left-2 bg-primary">
                ⭐ Top {i + 1}
              </span>

              <div className="flex-1 overflow-hidden transition-all duration-300 transform border-2 border-transparent group-hover:scale-105 group-hover:border-primary rounded-xl">
                <MovieCard movie={movie} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold text-center">No movies available</h1>
    </div>
  );
}
