  import express from "express"
  import { searchMoviesAndActors } from "../controllers/searchController.js"

  const searchRouter = express.Router()

  // GET /api/search?q=...
  searchRouter.get("/", searchMoviesAndActors)

  export default searchRouter;
