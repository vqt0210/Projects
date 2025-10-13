import MovieCard from "@/components/movies/MovieCard";
import BlurCircle from "@/components/common/BlurCircle";
import { useAppContext } from "@/context/AppContext";
export default function TopRated() {
  const { shows } = useAppContext();

  const positions = [
    { top: "100px", left: "50px" },
    { top: "400px", right: "150px" },
    { top: "800px", left: "200px" },
    { bottom: "300px", right: "100px" },
    { top: "1200px", left: "100px" },
  ];

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
        <h1 className="text-2xl font-semibold my-6 text-center md:text-left">
          Top Rated
        </h1>

        {/* Danh sách phim */}
        <div
          className="
          grid gap-8
          sm:grid-cols-2 
          md:grid-cols-3 
          lg:grid-cols-4 
          justify-items-center
        "
        >
          {topRatedMovies.map((movie, i) => (
            <div
              key={movie._id || i}
              className="relative group w-full max-w-[280px]"
            >
              {/* Badge Top 1–10 */}
              <span className="absolute top-2 left-2 bg-primary text-white text-xs font-bold px-2 py-1 rounded-md z-10">
                ⭐ Top {i + 1}
              </span>

              {/* MovieCard với hover effect */}
              <div className="transition-all duration-300 transform group-hover:scale-105 group-hover:border-primary border-2 border-transparent rounded-lg overflow-hidden">
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
