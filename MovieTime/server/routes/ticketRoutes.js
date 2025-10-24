import express from "express";
import { getTicketById } from "../controllers/ticketController.js";
import { requireAuth } from "@clerk/express";

const ticketRouter = express.Router();
// Chỉ người đã đăng nhập mới được xem vé
ticketRouter.get("/:id", requireAuth(), getTicketById);
export default ticketRouter;
