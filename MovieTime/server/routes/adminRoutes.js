import express from "express";
import { protectAdmin } from "../middleware/auth.js";
import { getAllBookings, getAllShows, getDashboardData, isAdmin, getUsers, updateUserRole, deleteUser, deleteShow, updateShow } from "../controllers/adminController.js";

const adminRouter = express.Router();

adminRouter.use(protectAdmin);

adminRouter.get('/is-admin', isAdmin);
adminRouter.get('/dashboard', getDashboardData);
adminRouter.get('/all-shows', getAllShows);
adminRouter.get('/all-bookings', getAllBookings);
adminRouter.get("/users", getUsers);
adminRouter.patch("/update-role/:id", updateUserRole);
adminRouter.delete("/delete-user/:userId", deleteUser);
adminRouter.delete("/delete-show/:id", deleteShow);
adminRouter.patch("/update-show/:id", updateShow);


export default adminRouter;