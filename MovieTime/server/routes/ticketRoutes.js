import express from "express";
import { getTicketById } from "../controllers/ticketController.js";

const ticketRouter = express.Router();
ticketRouter.get("/:id", getTicketById);
export default ticketRouter;
