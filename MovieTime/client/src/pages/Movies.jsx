import MovieCard from "../components/MovieCard";
import BlurCircle from "../components/BlurCircle";
import { useAppContext } from "../context/AppContext";

const Movies = () => {
  const positions = [
    { top: "100px", left: "50px" },
    { top: "400px", right: "150px" },
    { top: "800px", left: "200px" },
    { bottom: "300px", right: "100px" },
    { top: "1200px", left: "100px" },
  ];
  const { shows } = useAppContext();
  // Lọc trùng phim, mỗi phim chỉ giữ 1 show đại diện
  const uniqueShows = Array.isArray(shows)
    ? [
        ...new Map(
          shows
            .filter((show) => show.movie?._id)
            .map((show) => [show.movie._id, show.movie])
        ).values(),
      ]
    : [];

  return uniqueShows.length > 0 ? (
    <div className="relative pt-32 md:pt-36 pb-40 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]">
      {positions.map((pos, i) => (
        <BlurCircle key={i} {...pos} />
      ))}

      <div className="max-w-screen-xl mx-auto">
        <h1 className="text-2xl font-semibold my-6 text-center md:text-left">
          Now Showing
        </h1>

        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 justify-items-center">
          {uniqueShows.map((movie) => (
            <MovieCard movie={movie} key={movie._id} />
          ))}
        </div>
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold text-center">No movies available</h1>
    </div>
  );
};

export default Movies;
