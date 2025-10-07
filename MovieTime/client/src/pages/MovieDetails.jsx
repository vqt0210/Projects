import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BlurCircle from '../components/BlurCircle'
import { Heart, PlayCircleIcon, StarIcon } from 'lucide-react'
import timeFormat from '../lib/TimeFormat'
import DateSelect from '../components/DateSelect'
import MovieCard from '../components/MovieCard'
import Loading from '../components/Loading'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'

const MovieDetails = () => {

  const navigate = useNavigate()
  const {id} = useParams()
  const [show, setShow] = useState(null)
  const { shows, axios, getToken, user, fetchFavoriteMovies, favoriteMovies, image_base_url, setFavoriteMovies} = useAppContext();
  // Lọc ra các movie duy nhất
  const uniqueShows = [...new Map(shows.map(show => [show.movie._id, show])).values()]
  
   const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/show/${id}`)
      console.log('API Response:', data); // Log dữ liệu API trả về
      if (data.success) {
        setShow(data)
      } else {
        console.log('No show data found'); // Nếu không có dữ liệu, log lại
      }
    } catch (error) {
      console.log('Error fetching show data:', error); // Log lỗi nếu có
    }
  }

    const handleFavorite = async () => {
    if (!user) return toast.error("Please login to proceed");

    // kiểm tra hiện tại có trong favorites chưa
    const isAlreadyFavorite =
      Array.isArray(favoriteMovies) &&
      favoriteMovies.some((movie) => movie._id === id);

    // cập nhật UI trước (optimistic update)
    let updatedFavorites;
    if (isAlreadyFavorite) {
      updatedFavorites = favoriteMovies.filter((movie) => movie._id !== id);
      setFavoriteMovies(updatedFavorites);
      toast.success("Removed from favorites "); // hiện ngay
    } else {
      updatedFavorites = [...favoriteMovies, { _id: id }];
      setFavoriteMovies(updatedFavorites);
      toast.success("Added to favorites "); 
    }
     setFavoriteMovies(updatedFavorites);

    try {
      const { data } = await axios.post(
        "/api/user/update-favorite",
        { movieId: id },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );

      if (!data.success) {
      toast.error("Something went wrong!");
      // rollback lại từ server nếu fail
      fetchFavoriteMovies();
    } else {
      // sync lại với server cho chắc
      fetchFavoriteMovies();
    }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update favorite");
      // rollback nếu fail
      fetchFavoriteMovies();
    }
};
    
useEffect(() => {
  if (id) {
    console.log('Movie ID:', id);  // Kiểm tra giá trị id
    getShow();
  } else {
    console.error('Movie ID is undefined or missing in URL');
    toast.error('Invalid Movie ID');
  }
}, [id]);

   // Kiểm tra nếu show và show.movie tồn tại trước khi sử dụng
  if (!show || !show.movie) {
    return <Loading /> // Nếu show hoặc show.movie chưa có, trả về Loading
  }
  // Kiểm tra nếu show.movie.poster_path tồn tại
  const posterPath = show.movie.poster_path ? image_base_url + show.movie.poster_path : '/assets/backDropPath.jpg'; 


  return show ? (
    <div className='px-6 md:px-16 lg:px-40 pt-30 md:pt-50'>
      <div className='flex flex-col md:flex-row gap-8 max-w-6xl mx-auto'>
        <img src={posterPath} alt="" className='max-md:mx-auto rounded-xl h-104 max-w-70 object-cover' />

        <div className='relative flex flex-col gap-3'>
          <BlurCircle top="-100px" left = "-100px" />
          <p className='text-primary'>ENGLISH</p>
          <h1 className='text-4xl font-semibold max-w-96 text-balance'>{show.movie.title}</h1>
          <div className='flex items-center gap-2 text-gray-300'>
            <StarIcon className='w-5 h-5 text-primary fill-primary'/>
            {show.movie.vote_average.toFixed(1)} User Rating
          </div>

          <p className='text-gray-400 mt-2 text-sm leading-tight max-w-xl'>{show.movie.overview}</p>
          <p>
            {timeFormat(show.movie.runtime)} • {show.movie.genres.map(genre => genre.name).join(", ")} • {show.movie.release_date.split("-")[0]} {/*  Hàm split cắt chuỗi thành một mảng, dựa trên ký tự phân cách là "-"; [0]:Lấy phần tử đầu tiên trong mảng vừa tách ra */}
          </p>
          <div className='flex items-center flex-wrap gap-4 mt-4'>
            <button className='flex items-center gap-2 px-7 py-3 text-sm bg-gray-800 hover:bg-gray-800 transition rounded-md font-medium cursor-pointer active:scale-95'>
              <PlayCircleIcon className='w-5 h-5'/>
              Watch Trailer</button>
            <a href="#dateSelect" className='px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer active:scale-95'>Buy Tickets</a>
            <button onClick={handleFavorite} className='bg-gray-700 p-2.5 rounded full transition cursor-pointer active:scale-95'>
              <Heart 
              className={`w-5 h-5 ${
                Array.isArray(favoriteMovies) && favoriteMovies.some((movie) => movie._id === id) 
                  ? 'fill-primary text-primary' 
                  : ""}`} 
              />
            </button>
             
          </div>
        </div>
        

      </div>
          <div className='max-w-6xl mx-auto mt-12'>
          <h2 className='text-xl font-semibold mb-4'>Movie Cast</h2>
          <div className='overflow-x-auto no-scrollbar pb-4'>
            <div className='flex items-center gap-6 w-max px-4'>
              {/*.map duyệt qua từng phần tử trong mảng vừa cắt, index là vị trí của phần tử trong mảng */}
              {show.movie.casts.slice(0,12).map((cast, index) => ( 
                <div key={index} className='flex flex-col items-center text-center'>
                  <img 
                    src={image_base_url + cast.profile_path} 
                    alt="" 
                    className='rounded-full h-20 w-20 object-cover' 
                  />
                  <p className='font-medium text-xs mt-3'>{cast.name}</p>
                </div>
              ))}
            </div>
          </div>

          <DateSelect dateTime={show.dateTime} id={id}/>

          <p className='text-lg font-medium mt-20 mb-8'>You May Also Like</p>
          <div className='flex flex-wrap max-sm:justify-center gap-8 '>
              {uniqueShows.slice(0,4).map((movie, index) => (
                <MovieCard key={index} movie={movie}/>
              ))}
          </div>
          <div className='flex justify-center mt-20'>
            <button onClick={() => {navigate('/movies'); scrollTo(0,0)}} className='px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer'>
              Show More
            </button>

          </div>
        </div>
      </div>
    
    
  ) : <Loading/>
} 

export default MovieDetails
