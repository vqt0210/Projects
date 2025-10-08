import { useEffect, useState } from "react";
import MovieCard from "../components/MovieCard";
import Loading from "../components/Loading";
import { useAppContext } from "../context/AppContext";
import BlurCircle from "../components/BlurCircle";

export default function TopRated() {
  const { axios } = useAppContext();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  // decorative positions (same style as Movies)
  const positions = [
    { top: "100px", left: "50px" },
    { top: "400px", right: "150px" },
    { top: "800px", left: "200px" },
    { bottom: "300px", right: "100px" },
    { top: "1200px", left: "100px" },
  ];

  useEffect(() => {
    const fetchTop = async () => {
      try {
        const { data } = await axios.get(
          "/api/show/top-rated?minRate=7&limit=10"
        );
        const list = data?.movies ?? []; // dữ liệu từ DB
        setMovies(list);
      } catch (err) {
        console.error("TopRated fetch error", err);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTop();
  }, [axios]);

  // Lọc trùng phim, mỗi phim chỉ giữ 1 show đại diện

  const uniqueMovies = [
    ...new Map(movies.map((movie) => [movie._id, movie])).values(),
  ];

  if (loading) return <Loading />;
  return uniqueMovies.length > 0 ? (
    <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh] pt-8">
      {positions.map((pos, i) => (
        <BlurCircle key={i} {...pos} />
      ))}

      <h1 className="text-lg font-medium my-4">Top Rated</h1>

      <div className="grid grid-cols-4 gap-8 max-sm:grid-cols-2">
        {uniqueMovies.map((movie) => (
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
