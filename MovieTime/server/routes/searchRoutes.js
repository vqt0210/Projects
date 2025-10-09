  import express from "express"
  import { searchMoviesAndActors } from "../controllers/searchController.js"

  const searchRoutes = express.Router()

  // GET /api/search?q=...
  searchRoutes.get("/", searchMoviesAndActors)

  export default searchRoutes;
