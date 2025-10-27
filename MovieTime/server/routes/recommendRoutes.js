import express from "express";
import { recommendMovies } from "../controllers/recommendController.js";

const recommendRouter = express.Router();
// No admin restriction; controller will return 401 if unauthenticated
recommendRouter.get("/recommendations", recommendMovies);
export default recommendRouter;
