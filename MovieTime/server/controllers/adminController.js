// API to check if user is admin
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";
import { clerkClient } from "@clerk/express";
import sendEmail from "../configs/resend.js";
import { showTimeChangedEmail } from "../email/template.js";
import { cancelShowEmail } from "../email/template.js";

export const isAdmin = async (req, res) => {
  res.json({ success: true, isAdmin: true });
};

// API to get dashboard data

// API: Get Admin Dashboard Data
export const getDashboardData = async (req, res) => {
  try {
    const bookings = await Booking.find({ isPaid: true });
    const activeShows = await Show.find({
      showDateTime: { $gte: new Date() },
    }).populate("movie");
    const totalUser = await User.countDocuments();

    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((acc, b) => acc + (b.amount || 0), 0);

    // ==== Chart 1: Revenue by Month ====
    const revenueByMonth = await Booking.aggregate([
      { $match: { isPaid: true } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthLabels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const formattedRevenueByMonth = revenueByMonth.map((r) => ({
      month: monthLabels[r._id - 1],
      revenue: r.revenue,
    }));

    // ==== Chart 2: Tickets sold per Movie ====
    const ticketsByMovie = await Booking.aggregate([
      { $match: { isPaid: true } },
      {
        $lookup: {
          from: "shows",
          localField: "show",
          foreignField: "_id",
          as: "showInfo",
        },
      },
      { $unwind: "$showInfo" },
      {
        $lookup: {
          from: "movies",
          localField: "showInfo.movie",
          foreignField: "_id",
          as: "movieInfo",
        },
      },
      { $unwind: "$movieInfo" },
      {
        $group: {
          _id: "$movieInfo.title",
          tickets: { $sum: { $size: "$bookedSeats" } },
        },
      },
      { $sort: { tickets: -1 } },
      { $limit: 10 },
    ]);

    // ==== Chart 3: Revenue by Genre ====
    const revenueByGenre = await Booking.aggregate([
      { $match: { isPaid: true } },
      {
        $lookup: {
          from: "shows",
          localField: "show",
          foreignField: "_id",
          as: "showInfo",
        },
      },
      { $unwind: "$showInfo" },
      {
        $lookup: {
          from: "movies",
          localField: "showInfo.movie",
          foreignField: "_id",
          as: "movieInfo",
        },
      },
      { $unwind: "$movieInfo" },
      { $unwind: "$movieInfo.genres" },
      {
        $group: {
          _id: "$movieInfo.genres.name",
          totalRevenue: { $sum: "$amount" },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);
    // ==== Chart 4: Revenue by Movie ====
    const revenueByMovie = await Booking.aggregate([
      { $match: { isPaid: true } },
      {
        $lookup: {
          from: "shows",
          localField: "show",
          foreignField: "_id",
          as: "showInfo",
        },
      },
      { $unwind: "$showInfo" },
      {
        $lookup: {
          from: "movies",
          localField: "showInfo.movie",
          foreignField: "_id",
          as: "movieInfo",
        },
      },
      { $unwind: "$movieInfo" },
      {
        $group: {
          _id: "$movieInfo.title",
          totalRevenue: { $sum: "$amount" },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
    ]);

    const dashboardData = {
      totalBookings,
      totalRevenue,
      activeShows,
      totalUser,
      revenueByMonth: formattedRevenueByMonth,
      ticketsByMovie,
      revenueByGenre,
      revenueByMovie,
    };

    res.json({ success: true, dashboardData });
  } catch (error) {
    console.error("Dashboard data error:", error);
    res.status(500).json({ success: false, message: error.message });
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
        if (!userId) {
          return {
            ...booking.toObject(),
            user: { name: "Unknown user", email: "" },
          };
        }
        try {
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
      try {
        await revokeAllUserSessions(id);
      } catch (err) {
        console.warn("Failed to revoke Clerk sessions:", err.message);
      }
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

    // Kiểm tra user tồn tại
    const targetUser = await clerkClient.users
      .getUser(userId)
      .catch(() => null);
    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const targetRole = targetUser.privateMetadata?.role || "user";
    const currentUserRole = req.currentUser?.role || "user";

    // Chặn xoá super-admin
    if (targetRole === "super-admin") {
      return res
        .status(403)
        .json({ success: false, message: "Cannot delete super-admin" });
    }

    // Chặn admin xoá admin khác
    if (currentUserRole === "admin" && targetRole === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin cannot delete another admin",
      });
    }

    // Thực hiện xoá
    await clerkClient.users.deleteUser(userId);
    console.log(
      `${currentUserRole} (${req.currentUser?.id}) deleted user ${userId} (${targetRole})`
    );

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error(" Delete user error:", err);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

export const updateShow = async (req, res) => {
  try {
    const { id } = req.params;
    const { showDateTime, showPrice } = req.body;

    // Lấy show cần cập nhật
    const show = await Show.findById(id).populate("movie");
    if (!show) {
      return res
        .status(404)
        .json({ success: false, message: "Show not found" });
    }

    // Kiểm tra thời gian hợp lệ (không set về quá khứ)
    if (showDateTime && new Date(showDateTime) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Show time cannot be set in the past",
      });
    }

    // Lấy danh sách bookings để kiểm tra
    const bookings = await Booking.find({ show: id });
    const oldShowDateTime = show.showDateTime;

    // Không cho đổi giá nếu đã có người đặt
    if (bookings.length > 0 && showPrice) {
      return res.status(400).json({
        success: false,
        message: "Cannot change price after bookings exist",
      });
    }

    // Cập nhật dữ liệu
    if (showPrice) show.showPrice = showPrice;
    if (showDateTime) show.showDateTime = new Date(showDateTime);
    await show.save();

    // Nếu có người đặt và đổi giờ => gửi email thông báo qua Resend
    if (bookings.length > 0 && showDateTime) {
      console.log(
        `Sending showtime update emails for "${show.movie.title}"...`
      );

      await Promise.all(
        bookings.map(async (booking) => {
          try {
            const user = await clerkClient.users.getUser(booking.userId);
            const email = user.emailAddresses?.[0]?.emailAddress;
            if (!email)
              return console.warn(`User ${booking.userId} has no email`);

            await sendEmail({
              to: email,
              subject: `Your movie showtime has been updated 🎬`,
              body: showTimeChangedEmail({
                user: {
                  name: user.firstName || user.username || "Valued customer",
                },
                movieTitle: show.movie.title,
                oldShowDateTime,
                newShowDateTime: showDateTime,
                posterUrl: show.movie.poster_path
                  ? `${process.env.IMAGE_BASE_URL}${show.movie.poster_path}`
                  : null,
                supportLink: "https://www.teasonmike.io.vn",
              }),
            });
            console.log(`Sent update for "${show.movie.title}" → ${email}`);
          } catch (err) {
            console.warn(
              `Failed to send email for booking ${booking._id}:`,
              err.message
            );
          }
        })
      );
    }

    // Phản hồi về client
    res.json({ success: true, message: "Show updated successfully" });
  } catch (error) {
    console.error("updateShow error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteShow = async (req, res) => {
  try {
    const { id } = req.params;
    const forceDelete = Boolean(req.body.force); // thêm flag force
    const show = await Show.findById(id).populate("movie");

    if (!show) {
      return res
        .status(404)
        .json({ success: false, message: "Show not found" });
    }

    const bookings = await Booking.find({ show: id, isPaid: true });

    // Nếu có người đặt mà không bật force
    if (bookings.length > 0 && !forceDelete) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete show — users already booked",
      });
    }

    // Nếu force=true, gửi email hủy cho người dùng
    if (bookings.length > 0 && forceDelete) {
      for (const booking of bookings) {
        const user = await User.findById(booking.user);
        if (!user?.email) continue;

        await sendEmail({
          to: user.email,
          subject: `Show Cancelled: ${show.movie.title}`,
          body: cancelShowEmail({
            user,
            movieTitle: show.movie.title,
            showDateTime: show.showDateTime,
            supportLink: "https://www.teasonmike.io.vn",
          }),
        });
        console.log(
          `Email sent to ${user.email} for cancelled show ${show.movie.title}`
        );
      }
    }

    // Xoá show sau khi thông báo
    await show.deleteOne();
    res.json({
      success: true,
      message: bookings.length
        ? "Show deleted and users notified."
        : "Show deleted successfully.",
    });
  } catch (error) {
    console.error("deleteShow error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

async function revokeAllUserSessions(userId) {
  try {
    const sessionsResponse = await clerkClient.sessions.getSessionList({ userId });
    const sessions = sessionsResponse.data || []; 
    
    if (!sessions.length) {
      console.log(`No active sessions found for user ${userId}`);
      return;
    }

    for (const sess of sessions) {
      try {
        await clerkClient.sessions.revokeSession(sess.id);
        console.log(`Revoked session ${sess.id} for user ${userId}`);
      } catch (err) {
        console.warn("Failed to revoke session", sess.id, err.message);
      }
    }
  } catch (err) {
    console.error("Error fetching sessions for user:", userId, err.message);
  }
}
