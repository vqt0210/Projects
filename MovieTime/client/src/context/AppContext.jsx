import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api, { authorizedApi } from "../utils/api.js";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [shows, setShows] = useState([]);
  const [favoriteMovies, setFavoriteMovies] = useState([]);

  const image_base_url = import.meta.env.VITE_TMDB_IMAGE_BASE_URL;

  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // ================== AUTH & ROLE ==================
  useEffect(() => {
    if (!isLoaded) return;
    if (user) {
      fetchIsAdmin();
      fetchFavoriteMovies();
    }
  }, [isLoaded, user]);

  const fetchIsAdmin = async () => {
    setIsCheckingAdmin(true);
    try {
      const authApi = await authorizedApi(getToken);
      const { data } = await authApi.get("/api/admin/is-admin");

      if (!data || typeof data.isAdmin !== "boolean") {
        throw new Error("Invalid response from server");
      }

      setIsAdmin(data.isAdmin);

      if (!data.isAdmin && location.pathname.startsWith("/admin")) {
        navigate("/");
        toast.dismiss();
        toast.error("You are not allowed to access admin dashboard", {
          id: "admin-error",
        });
      }
    } catch (error) {
      // 👉 Nếu lỗi 403 (người dùng thường) thì chỉ coi như isAdmin = false, không log, không toast
      if (error.response?.status === 403) {
        setIsAdmin(false);
        return;
      }

      // 👉 Nếu là lỗi khác (token hết hạn, lỗi mạng, server chết, v.v.)
      console.error("fetchIsAdmin error:", error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch admin status"
      );
    } finally {
      setIsCheckingAdmin(false);
    }
  };

  // ================== MOVIES ==================
  const fetchShows = async () => {
    try {
      const { data } = await api.get("/api/show/all");
      if (data.success) setShows(data.shows);
      else toast.error(data.message);
    } catch (error) {
      console.error("fetchShows error:", error);
    }
  };

  useEffect(() => {
    fetchShows();
  }, []);

  // ================== FAVORITES ==================
  const fetchFavoriteMovies = async () => {
    try {
      const authApi = await authorizedApi(getToken);
      const { data } = await authApi.get("/api/user/favorites");

      if (data.success) setFavoriteMovies(data.movies);
      else console.warn(data.message);
    } catch (error) {
      console.error("fetchFavoriteMovies error:", error);
    }
  };

  const syncFavorites = async () => {
    try {
      const authApi = await authorizedApi(getToken);
      const { data } = await authApi.post("/api/user/sync-favorites");
      if (data.success) setFavoriteMovies(data.movies);
    } catch (error) {
      console.error("syncFavorites error:", error);
    }
  };

  const toggleFavorite = async (movieId) => {
    try {
      const authApi = await authorizedApi(getToken);
      const { data } = await authApi.post("/api/user/update-favorite", {
        movieId,
      });

      toast.success(
        data.message.includes("added")
          ? "❤️ Added to favorites"
          : "💔 Removed from favorites"
      );
      await syncFavorites();
    } catch (error) {
      console.error("toggleFavorite error:", error);
    }
  };

  // ================== CONTEXT VALUE ==================
  const value = {
    axios,
    user,
    getToken,
    navigate,
    isAdmin,
    isCheckingAdmin,
    shows,
    fetchShows,
    image_base_url,
    favoriteMovies,
    setFavoriteMovies,
    fetchFavoriteMovies,
    syncFavorites,
    toggleFavorite,
    fetchIsAdmin,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
export default AppProvider;
