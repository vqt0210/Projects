import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
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
    try {
      const token = await getToken({ skipCache: true });
      const { data } = await axios.get("/api/admin/is-admin", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setIsAdmin(data.isAdmin);

      if (!data.isAdmin && location.pathname.startsWith("/admin")) {
        navigate("/");
        toast.dismiss();
        toast.error("You are not allowed to access admin dashboard", {
          id: "admin-error",
        });
      }
    } catch (error) {
      console.error("fetchIsAdmin error:", error);
    }
  };

  // ================== MOVIES ==================
  const fetchShows = async () => {
    try {
      const { data } = await axios.get("/api/show/all");
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
      const token = await getToken({ skipCache: true });
      const { data } = await axios.get("/api/user/favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) setFavoriteMovies(data.movies);
      else console.warn(data.message);
    } catch (error) {
      console.error("fetchFavoriteMovies error:", error);
    }
  };

  // Đồng bộ favorites giữa Clerk & MongoDB
  const syncFavorites = async () => {
    try {
      const token = await getToken({ skipCache: true });
      if (!token) return;

      const { data } = await axios.post("/api/user/sync-favorites", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) setFavoriteMovies(data.movies)
    } catch (error) {
      console.error("syncFavorites error:", error);
    }
  };

  // Thêm / Xóa movie khỏi favorites
  const toggleFavorite = async (movieId) => {
    try {
      const token = await getToken({ skipCache: true });
      if (!token) return;

      const { data } = await axios.post("/api/user/update-favorite", { movieId }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Favorite update:", data.message);
      if (data.message.includes("added")) {
      toast.success("Added to favorites ❤️");
    } else if (data.message.includes("removed")) {
      toast.success("Removed from favorites ");
    }
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
    shows,
    fetchShows,
    image_base_url,
    favoriteMovies,
    setFavoriteMovies,
    fetchFavoriteMovies,
    syncFavorites,
    toggleFavorite,
    fetchIsAdmin
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

const useAppContext = () => useContext(AppContext);
export { useAppContext };
export default AppProvider;
