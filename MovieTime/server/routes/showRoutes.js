import express from "express";
import { addShow, getNowPlayingMovies, getShow, getShows } from "../controllers/showController.js";
import { protectAdmin } from "../middleware/auth.js";
import { clearDatabase } from "../controllers/showController.js";

const showRouter = express.Router();

showRouter.get('/now-playing', protectAdmin, getNowPlayingMovies)
showRouter.post('/add', protectAdmin,  addShow )
showRouter.get('/all', getShows)
showRouter.get('/:movieId', getShow)

showRouter.delete("/clear", clearDatabase);


export default showRouter;