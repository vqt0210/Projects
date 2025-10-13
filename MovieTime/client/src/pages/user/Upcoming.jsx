import { useEffect, useState } from "react";
import MovieCard from "@/components/movies/MovieCard";
import BlurCircle from "@/components/common/BlurCircle";
import Loading from "@/components/common/Loading";   // nếu cần
import api from "@/utils/api";

export default function Upcoming() {
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
    const fetchMovies = async () => {
      try {
        const { data } = await api.get("/api/show/upcoming?page=1", {
          timeout: 5000,
        });
        const list = data?.results ?? data?.movies ?? [];
        setMovies(list);
      } catch (err) {
        console.error("Upcoming fetch error:", err);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  if (loading) return <Loading />;

  const uniqueMovies = [
    ...new Map(movies.map((movie) => [movie._id || movie.id, movie])).values(),
  ];

  return uniqueMovies.length > 0 ? (
    <div className="relative pt-32 md:pt-36 pb-40 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]">
      {positions.map((pos, i) => (
        <BlurCircle key={i} {...pos} />
      ))}

      <div className="max-w-screen-xl mx-auto">
        <h1 className="text-2xl font-semibold my-6 text-center md:text-left">
          Upcoming
        </h1>

        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 justify-items-center">
          {uniqueMovies.map((movie, i) => (
            <MovieCard
              movie={movie}
              isUpcoming={true}
              key={movie._id || movie.id || i}
            />
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
