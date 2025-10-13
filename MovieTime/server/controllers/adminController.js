// API to check if user is admin
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";
import { clerkClient } from "@clerk/express";

export const isAdmin = async (req, res) => {
  res.json({ success: true, isAdmin: true });
};

// API to get dashboard data

export const getDashboardData = async (req, res) => {
  try {
    const bookings = await Booking.find({ isPaid: true });
    const activeShows = await Show.find({
      showDateTime: { $gte: new Date() },
    }).populate("movie");
    const totalUser = await User.countDocuments();

    const dashboardData = {
      totalBookings: bookings.length,
      totalRevenue: bookings.reduce((acc, booking) => acc + booking.amount, 0),
      activeShows,
      totalUser,
    };

    res.json({ success: true, dashboardData });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all shows
export const getAllShows = async (req, res) => {
  try {
    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate("movie")
      .sort({ showDateTime: 1 });
    res.json({ success: true, shows });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all bookings
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate({
        path: "show",
        populate: { path: "movie" },
      })
      .sort({ createdAt: -1 });

    const enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const userId = booking.userId?.toString();
        console.log("🧩 Booking userId:", booking.userId); 
        if (!userId) {
          return { ...booking.toObject(), user: { name: "Unknown user", email: "" } };
        }
        try {
          console.log("🧩 Booking ID:", booking._id.toString(), "→ userId:", booking.userId);
          const clerkUser = await clerkClient.users.getUser(booking.userId);

          const userInfo = {
            name:
              (clerkUser.firstName && clerkUser.lastName
                ? `${clerkUser.firstName} ${clerkUser.lastName}`
                : clerkUser.username) || "Unnamed",
            email: clerkUser.emailAddresses?.[0]?.emailAddress || "No email",
            image: clerkUser.imageUrl,
          };

          return { ...booking.toObject(), user: userInfo };
        } catch (err) {
          console.warn(`⚠️ Missing or deleted user for booking ${booking._id}`);
          return {
            ...booking.toObject(),
            user: { name: "Unknown user", email: "" },
          };
        }
      })
    );

    res.json({ success: true, bookings: enrichedBookings });
  } catch (error) {
    console.error("getAllBookings error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch bookings" });
  }
};

// Get User List
export const getUsers = async (req, res) => {
  try {
    const { data } = await clerkClient.users.getUserList({ limit: 100 });
    const mapped = data.map((u) => ({
      id: u.id,
      name: u.firstName
        ? `${u.firstName} ${u.lastName || ""}`.trim()
        : u.username,
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
  const ROLES = ["super-admin", "admin", "user"];
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }
    const targetUser = await clerkClient.users.getUser(id);
    const targetRole = targetUser.privateMetadata?.role || "user";

    // Lấy user hiện tại từ session (cần middleware hoặc req.currentUser)
    const currentUserRole = req.currentUser?.role || "user";

    // Chặn admin thường thao tác trên super-admin
    if (currentUserRole !== "super-admin" && targetRole === "super-admin") {
      return res
        .status(403)
        .json({ success: false, message: "Cannot modify super-admin" });
    }

    await clerkClient.users.updateUserMetadata(id, {
      privateMetadata: { role },
    });
    if (role === "user") {
      await clerkClient.users.revokeSessions(id);
    }

    res.json({ success: true, message: `Role updated to ${role}` });
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ success: false, message: "Failed to update role" });
  }
};
// Delete User
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const targetUser = await clerkClient.users.getUser(userId);
    const targetRole = targetUser.privateMetadata?.role || "user";

    const currentUserRole = req.currentUser?.role || "user";

    if (targetRole === "super-admin") {
      return res
        .status(403)
        .json({ success: false, message: "Cannot delete super-admin" });
    }

    await clerkClient.users.deleteUser(userId);
    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};
