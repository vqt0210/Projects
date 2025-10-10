// Middleware kiểm tra admin hoặc super-admin
export const protectAdmin = async (req, res, next) => {
  try {
    // Nếu đã attachCurrentUser
    const user = req.currentUser;

    if (!user || (user.role !== "admin" && user.role !== "super-admin")) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    next();
  } catch (error) {
    console.error(error);
    return res.status(403).json({ success: false, message: "Not authorized" });
  }
};
