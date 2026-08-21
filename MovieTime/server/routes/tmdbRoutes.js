import express from "express";
import { proxyTmdb } from "../controllers/tmdbController.js";

const tmdbRouter = express.Router();

// Wildcard: bắt mọi path phía sau /api/tmdb/ và forward sang TMDB thật.

tmdbRouter.get("/*splat", proxyTmdb);

export default tmdbRouter;
