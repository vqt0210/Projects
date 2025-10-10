
// API to check if user is admin

import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";
import { clerkClient } from "@clerk/express";

export const isAdmin = async(req, res) => {
  res.json({success: true, isAdmin: true})
}

// API to get dashboard data

export const getDashboardData = async (req, res)=> {
  try {
    const bookings = await Booking.find({isPaid: true});
    const activeShows = await Show.find({showDateTime: {$gte: new Date()}}).populate('movie');
    const totalUser = await User.countDocuments();

    const dashboardData = {
      totalBookings: bookings.length,
      totalRevenue: bookings.reduce((acc, booking)=> acc + booking.amount, 0),
      activeShows,
      totalUser
    }

    res.json({success: true, dashboardData})
  } catch (error) {
      console.error(error);
      res.json({success: false, message: error.message})
  }
}

// API to get all shows
export const getAllShows = async(req, res) => {
  try {
      const shows = await Show.find({showDateTime: { $gte: new Date()}}).populate('movie').sort({ showDateTime: 1})
      res.json({success: true, shows})
  } catch (error) {
      console.error(error);
      res.json({success: false, message: error.message})
  }
}


// API to get all bookings
export const getAllBookings = async (req,res) => {
  try {
    const bookings = await Booking.find({}).populate('user').populate({
      path: "show",
      populate: {path: "movie"}
    }).sort({ createdAt: -1 })
    res.json({success: true, bookings })
  } catch (error) {
      console.error(error);
      res.json({success: false, message: error.message})
  }
}

// Get User List
export const getUsers = async (req, res) => {
  try {
    const { data } = await clerkClient.users.getUserList({ limit: 100 });
    const mapped = data.map(u => ({
      id: u.id,
      name: u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : u.username,
      email: u.emailAddresses?.[0]?.emailAddress,
      image: u.imageUrl,
      role: u.privateMetadata?.role || "user",
      createdAt: u.createdAt,
    }));

    res.json({ success: true, users: mapped });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

// Update role for user
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    await clerkClient.users.updateUserMetadata(id, {
      privateMetadata: { role },
    });

    res.json({ success: true, message: `Role updated to ${role}` });
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ success: false, message: "Failed to update role" });
  }
};
