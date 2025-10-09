import express from "express"
import { getActorDetail } from "../controllers/actorController.js"

const actorRoutes = express.Router()

// GET /api/actors/:id
actorRoutes.get("/:id", getActorDetail)

export default actorRoutes;
