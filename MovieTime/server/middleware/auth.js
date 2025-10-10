import { clerkClient, getAuth } from "@clerk/express";

// Middleware bảo vệ admin hoặc super-admin
export const protectAdmin = async (req, res, next) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    // Xác thực token với Clerk
    const { userId } = getAuth(req); // Clerk sẽ lấy từ header tự động
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Lấy thông tin user từ Clerk
    const user = await clerkClient.users.getUser(userId);

    // Kiểm tra role
    const role = user.privateMetadata?.role || "user";
    if (role !== "admin" && role !== "super-admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Gắn user vào request để các controller có thể dùng
    req.currentUser = { id: user.id, role, email: user.emailAddresses?.[0]?.emailAddress };

    next();
  } catch (error) {
    console.error("protectAdmin error:", error);
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};
