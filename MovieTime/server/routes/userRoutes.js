import express from "express";
import { requireAuth } from "@clerk/express";
import {
  getFavorites,
  getUserBookings,
  syncFavorites,
  updateFavorite,
} from "../controllers/userController.js";

const userRouter = express.Router();

//  Bắt buộc đăng nhập cho các route cần userId
userRouter.get("/bookings", requireAuth(), getUserBookings);
userRouter.post("/update-favorite", requireAuth(), updateFavorite);
userRouter.get("/favorites", requireAuth(), getFavorites);
userRouter.post("/sync-favorites", requireAuth(), syncFavorites);

export default userRouter;
