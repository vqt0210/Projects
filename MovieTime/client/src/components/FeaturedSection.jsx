import { ArrowRightIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BlurCircle from './BlurCircle'
import MovieCard from './MovieCard'
import { useAppContext } from '../context/AppContext'


const FeaturedSection = () => {
  const navigate = useNavigate()
  const { shows } = useAppContext()
  // Lọc trùng phim, mỗi phim chỉ giữ 1 show đại diện
  const uniqueShows = [...new Map(shows.map(show => [show.movie._id, show])).values()]

  return (
    <div className='px-6 md:px-16 lg:px-24 xl:px-44 overflow-hidden'> {/*Overflow-hidden dùng để tránh phần tử con tràn ra ngoài */}
      
      <div className="relative flex items-center justify-between pt-20 pb-6">
        <BlurCircle top="0" right="-80px" />

        {/* Left: title + subtitle + count */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
            <span className="block">Now Showing</span>
          </h2>

          {/* small descriptor + pill count */}
          <div className="flex items-center gap-3 text-sm text-gray-300">
            <span className="hidden sm:inline">Latest releases &amp; showtimes</span>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/6 text-xs font-medium text-gray-100"
              aria-hidden="true"
            >
              {uniqueShows.length} titles
            </span>
          </div>
        </div>

        {/* Right: view all button */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => { navigate('/movies'); scrollTo(0, 0) }}
            className="group inline-flex items-center gap-3 px-3.5 py-2 rounded-md bg-white/3 hover:bg-white/6 transition"
            aria-label="View all movies"
          >
            <span className="text-sm md:text-base font-medium text-gray-100 cursor-pointer">View all</span>

            {/* animated arrow */}
            <span className="transform transition-transform duration-300 group-hover:translate-x-1">
              <ArrowRightIcon className="w-4 h-4 text-primary" />
            </span>
          </button>
        </div>
      </div>
      <div className='grid gap-8 mt-8 
                grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
        
        {uniqueShows.slice(0,8).map((show) => (
          <MovieCard key={`${show._id}-${show.movie._id}`} movie={show.movie} /> // dùng key để nhận diện phần tử, ko có key sẽ phải render lại từ đầu
        ))}
      </div>
      {/*Show more button will navigate to the /movies route through the onClick arrow fucntion */}
      <div className='flex justify-center mt-20'>
        <button onClick={() => {navigate('/movies'); scrollTo(0,0)}} className='px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer'>Show more</button>
      </div>
      
    </div>
  )
}

export default FeaturedSection
