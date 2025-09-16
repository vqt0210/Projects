import { dummyShowsData } from '../assets/assets'
import MovieCard from '../components/MovieCard'
import BlurCircle from '../components/BlurCircle'

const Favorite = () => {
  // Lấy ra vài phim từ danh sách dummy
  const favoriteMovies = dummyShowsData.slice(4, 12)

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
  )
}

export default Favorite
