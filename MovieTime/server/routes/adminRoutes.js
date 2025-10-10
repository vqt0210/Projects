import express from "express";
import { protectAdmin } from "../middleware/auth.js";
import { getAllBookings, getAllShows, getDashboardData, isAdmin, getUsers, updateUserRole, deleteUser } from "../controllers/adminController.js";

const adminRouter = express.Router();

adminRouter.get('/is-admin', protectAdmin, isAdmin)
adminRouter.get('/dashboard', protectAdmin, getDashboardData)
adminRouter.get('/all-shows', protectAdmin, getAllShows)
adminRouter.get('/all-bookings', protectAdmin, getAllBookings)
// Manage User Routes
adminRouter.get("/users", protectAdmin, getUsers);
adminRouter.patch("/update-role/:id", protectAdmin, updateUserRole);
adminRouter.delete("/delete-user/:userId", protectAdmin, deleteUser);


export default adminRouter;