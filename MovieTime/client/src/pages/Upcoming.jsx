import { useEffect, useState } from "react";
import MovieCard from "../components/MovieCard";
import Loading from "../components/Loading";
import { useAppContext } from "../context/AppContext";
import BlurCircle from "../components/BlurCircle";

export default function Upcoming() {
  const { axios } = useAppContext();
  const [movies, setMovies] = useState([]); 
  const [loading, setLoading] = useState(true);

  const positions = [
    { top: "100px", left: "50px" },
    { top: "400px", right: "150px" },
    { top: "800px", left: "200px" },
    { bottom: "300px", right: "100px" },
    { top: "1200px", left: "100px" },
  ];

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get("/api/show/upcoming?page=1");
        const list = data?.results ?? data?.movies ?? [];
        setMovies(list);
      } catch (err) {
        console.error("Upcoming fetch error", err);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [axios]);

  if (loading) return <Loading />;

  const uniqueMovies = [...new Map(movies.map((movie) => [movie._id || movie.id, movie])).values()];

  return uniqueMovies.length > 0 ? (
    <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh] pt-8">
      {positions.map((pos, i) => (
        <BlurCircle key={i} {...pos} />
      ))}

      <h1 className="text-lg font-medium my-4">Upcoming</h1>
      <div className="grid grid-cols-4 gap-8 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
        {uniqueMovies.map((movie, i) => (
          <MovieCard movie={movie} isUpcoming={true} key={movie._id || movie.id || i} />
        ))}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold text-center">No movies available</h1>
    </div>
  );
}
