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
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-medium text-gray-300">Loading favorites...</h1>
      </div>
    );
  }

  return favoriteMovies.length > 0 ? (
    <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]">
      <BlurCircle top="150px" left="0px" />
      <BlurCircle top="400px" right="100px" />
      <BlurCircle bottom="100px" left="200px" />
      <BlurCircle bottom="300px" right="50px" />
      <BlurCircle top="800px" left="50%" />
      <h1 className="text-lg font-medium my-4">Your Favorite Movies</h1>

      <div className="flex flex-wrap max-sm:justify-center gap-8">
        {favoriteMovies.map((movie, index) => (
          <MovieCard movie={movie} key={`${movie._id}-${index}`} />
        ))}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold text-center">No movies available</h1>
    </div>
  );
};

export default Favorite;
