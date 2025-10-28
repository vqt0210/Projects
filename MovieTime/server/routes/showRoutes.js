import express from "express";
import { addShow, getNowPlayingMovies, getShow, getShows, getTopRatedMovies, getUpcomingMovies, searchMovieByTitle } from "../controllers/showController.js";
import { protectAdmin } from "../middleware/auth.js";


const showRouter = express.Router();

showRouter.get('/now-playing', protectAdmin, getNowPlayingMovies)
showRouter.get("/top-rated", getTopRatedMovies);   
showRouter.get("/upcoming", getUpcomingMovies); 
// Route thêm và lấy danh sách show
showRouter.post('/add', protectAdmin,  addShow )
showRouter.get('/all', getShows)
showRouter.get("/search", searchMovieByTitle);
// Đặt route động ở cuối cùng


showRouter.get('/:movieId', getShow)



export default showRouter;