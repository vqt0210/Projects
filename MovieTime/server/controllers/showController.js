import axios from "axios"
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import { inngest } from "../inngest/index.js";


// API to get now playing movies from TMDB API
export const getNowPlayingMovies = async (req, res)=> {
  try {
    const {data} = await axios.get('https://api.themoviedb.org/3/movie/now_playing', {
      headers: {Authorization : `Bearer ${process.env.TMDB_API_KEY}`}
    })

    const movies = data.results;
    res.json({success: true, movies: movies})
  } catch (error) {
      console.error(error);
      res.json({success: false, message: error.message})
  }
}


// API to add a new show to the database

export const addShow = async( req, res) => {
  
  try {
    console.log("Authorization header:", req.headers.authorization);
    console.log("req.body:", req.body);
    const { movieId, showsInput, showPrice} = req.body

    let movie = await Movie.findById(movieId)

    if(!movie || !movie.trailer) {
      // Fetch movie details and credits from TMDB API
      const [movieDetailsResponse, movieCreditsResponse, movieVideosResponse] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}`,{ 
          headers: {Authorization: `Bearer ${process.env.TMDB_API_KEY.trim()}`}}),

        axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`,{
          headers: {Authorization: `Bearer ${process.env.TMDB_API_KEY.trim()}`}}),
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}/videos`, {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY.trim()}`},
        }),
      ]);

      const movieApiData = movieDetailsResponse.data;
      const movieCreditsData = movieCreditsResponse.data;
      const movieVideosData = movieVideosResponse.data;
            // Ưu tiên trailer official từ YouTube, nếu không có thì lấy trailer đầu tiên
      let trailer = movieVideosData.results.find(
        (vid) => vid.type === "Trailer" && vid.site === "YouTube" && vid.official
      );
      if (!trailer) {
        trailer = movieVideosData.results.find(
          (vid) => vid.type === "Trailer" && vid.site === "YouTube"
        );
      }

      const movieDetails = {
        _id: movieId,
        title: movieApiData.title,
        overview: movieApiData.overview,
        poster_path: movieApiData.poster_path,
        backdrop_path: movieApiData.backdrop_path,
        genres: movieApiData.genres,
        casts: movieCreditsData.cast,
        release_date: movieApiData.release_date,
        original_language: movieApiData.original_language,
        tagline: movieApiData.tagline || "",
        vote_average: movieApiData.vote_average,
        runtime: movieApiData.runtime,
        trailer: trailer ? `https://www.youtube.com/embed/${trailer.key}` : null,
      }

      // Add movie to the database
      if (!movie) {
        movie = await Movie.create(movieDetails);
      } else if (!movie.trailer) {
        await Movie.findByIdAndUpdate(movieId, { trailer: movieDetails.trailer });
        movie.trailer = movieDetails.trailer; // cập nhật tạm trong biến để gửi về client
      }
    }

    const showsToCreate = [];


    showsInput.forEach(show => {
      const showDate = show.date;
      const time = show.time;
      const dateTimeString = `${showDate}T${time}`;
      showsToCreate.push({
        movie: movieId,
        showDateTime: new Date(dateTimeString),
        showPrice,
        occupiedSeats: {}
      });
    });

    if(showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
    }

    // Trigger Inngest Event
    await inngest.send({
      name: "app/show.added",
      data: {
        movieTitle: movie.title
      }
    })

    res.json({success: true, message: 'Show Added Successfully'})

  } catch (error) {
    console.log(error);
    res.json({success: false , message: error.message})
  }
}

// API to get all shows from the database
export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate('movie')
      .sort({ showDateTime: 1 });

    res.json({ success: true, shows })
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get a single show from the database
export const getShow = async (req, res) => {
  try {
      const {movieId} = req.params;
      // Get all upcoming shows for the movie
      const shows = await Show.find({movie: movieId, showDateTime: { $gte: new Date()}})

      const movie = await Movie.findById(movieId);
      const dateTime = {};

      shows.forEach((show) => {
       const date = show.showDateTime.toISOString().split("T")[0];
       if(!dateTime[date]){
        dateTime[date] = []
       }
       dateTime[date].push({ time: show.showDateTime, showId: show._id })
      })

      res.json({success: true, movie, dateTime})
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message});
  }
}