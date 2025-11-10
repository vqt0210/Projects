import axios from "axios";

// Cấu hình base URL từ môi trường
const BASE_URL = import.meta.env.VITE_BASE_URL;
console.log("Current API Base URL:", import.meta.env.VITE_BASE_URL);

// Tạo instance axios cơ bản
const api = axios.create({
  baseURL: BASE_URL,
});

// Hàm helper: tạo axios instance với token từ Clerk
export const authorizedApi = async (getToken) => {
  try {
    // Lấy token mới nhất từ Clerk (tránh lấy token cũ)
    const token = await getToken({ skipCache: true });

    // Kiểm tra token hợp lệ
    if (!token) {
      throw new Error("Token is not available.");
    }

    // Xử lý token, loại bỏ khoảng trắng và ký tự không hợp lệ
    const cleanToken = token.replace(/["\s]/g, "");

    return axios.create({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${cleanToken}`,
      },
    });
  } catch (error) {
    console.error("Error while getting token:", error.message);
    throw new Error("Failed to get token");
  }
};

export default api;
