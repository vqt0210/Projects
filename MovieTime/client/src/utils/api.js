import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
});

// Hàm helper: tạo axios instance có token
export const authorizedApi = async (getToken) => {
  const token = await getToken({ skipCache: true }); // tránh token cũ
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${token?.replace(/["\s]/g, "") || ""}`,
    },
  });
};

export default api;
