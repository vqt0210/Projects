import { useEffect, useState } from "react";
import MovieCard from "../components/MovieCard";
import BlurCircle from "../components/BlurCircle";
import { useAppContext } from "../context/AppContext";

const Favorite = () => {
  const [loading, setLoading] = useState(true);
  const { favoriteMovies, syncFavorites } = useAppContext();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await syncFavorites();
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-300">
        <h1 className="text-2xl font-medium animate-pulse">Loading favorites...</h1>
      </div>
    );
  }

  return favoriteMovies.length > 0 ? (
    <div className="relative pt-32 md:pt-36 pb-40 px-6 md:px-16 lg:px-24 xl:px-32 2xl:px-[12%] overflow-hidden min-h-[80vh]">
      {/* Hiệu ứng nền */}
      <BlurCircle top="150px" left="0px" />
      <BlurCircle top="400px" right="100px" />
      <BlurCircle bottom="100px" left="200px" />
      <BlurCircle bottom="300px" right="50px" />
      <BlurCircle top="800px" left="50%" />

      {/* Tiêu đề */}
      <div className="max-w-screen-xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold mb-10 text-white text-center md:text-left">
          Your Favorite Movies
        </h1>

        {/* Lưới phim */}
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 justify-items-center">
          {favoriteMovies.map((movie, index) => (
            <MovieCard movie={movie} key={`${movie._id}-${index}`} />
          ))}
        </div>
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-screen text-gray-300">
      <h1 className="text-3xl font-bold mb-4">No favorites yet</h1>
      <p className="text-sm opacity-80">Add some movies to your list ❤️</p>
    </div>
  );
};

export default Favorite;
