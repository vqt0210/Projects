import { useAppContext } from "../context/AppContext";
import MovieCard from "../components/MovieCard";
import BlurCircle from "../components/BlurCircle";

export default function TopRated() {
  const { shows } = useAppContext();

  const positions = [
    { top: "100px", left: "50px" },
    { top: "400px", right: "150px" },
    { top: "800px", left: "200px" },
    { bottom: "300px", right: "100px" },
    { top: "1200px", left: "100px" },
  ];

  const uniqueShows = [...new Map(shows.map(show => [show.movie._id, show])).values()];
  const movies = uniqueShows.map(show => show.movie);

  const topRatedMovies = movies
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 10);

  return topRatedMovies.length > 0 ? (
    <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh] pt-8">
      {positions.map((pos, i) => (
        <BlurCircle key={i} {...pos} />
      ))}

      <h1 className="text-lg font-medium my-4">Top Rated</h1>

      <div className="grid grid-cols-4 gap-8 max-sm:grid-cols-2">
        {topRatedMovies.map(movie => (
          <MovieCard movie={movie} key={movie._id} />
        ))}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold text-center">No movies available</h1>
    </div>
  );
}
