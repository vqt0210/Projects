import express from "express"
import { getActorDetail } from "../controllers/actorController.js"

const actorRouter = express.Router()

// GET /api/actors/:id
actorRouter.get("/:id", getActorDetail)

export default actorRouter;
