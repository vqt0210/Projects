import { createContext, useContext, useEffect, useRef, useState } from "react";
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
  const isSignedIn = !!user;

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
      setIsCheckingAdmin(true); // bắt đầu check

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
      if (error.response?.status === 403) {
        setIsAdmin(false);
        if (location.pathname.startsWith("/admin")) {
          navigate("/");
          toast.dismiss();
          toast.error("You are not allowed to access admin dashboard", {
            id: "admin-error",
          });
        }
      } else {
        console.error("fetchIsAdmin error:", error);
        toast.error(
          error.response?.data?.message ||
            error.message ||
            "Failed to fetch admin status",
        );
      }
    } finally {
      // Quan trọng: đảm bảo luôn dừng loading
      setIsCheckingAdmin(false);
    }
  };

  // ================== MOVIES ==================
  const fetchShows = async () => {
    try {
      const { data } = await api.get("/api/show/all");
      if (data.success) {
        // lọc thêm 1 lần ở client cho chắc
        const valid = data.shows.filter(
          (show) => new Date(show.showDateTime) > new Date(),
        );
        setShows(valid);
      }
    } catch (error) {
      console.error("fetchShows error:", error);
    }
  };

  useEffect(() => {
    fetchShows();
  }, []);

  // ================== FAVORITES ==================
  const fetchFavoriteMovies = async () => {
    const cacheKey = `favorites_${user?.id}`;

    // 1. Hiện dữ liệu cũ đã lưu
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setFavoriteMovies(JSON.parse(cached));
      } catch (e) {
        console.warn("Cache favorites hỏng, bỏ qua:", e);
      }
    }

    // 2. Gọi API phía sau, cập nhật lại cho đúng dữ liệu mới nhất
    try {
      const authApi = await authorizedApi(getToken);
      const { data } = await authApi.get("/api/user/favorites");
      if (data.success) {
        setFavoriteMovies(data.movies);
        localStorage.setItem(cacheKey, JSON.stringify(data.movies));
      }
    } catch (error) {
      console.error("fetchFavoriteMovies error:", error);
    }
  };

  const syncFavorites = async () => {
    try {
      const authApi = await authorizedApi(getToken);
      const { data } = await authApi.post("/api/user/sync-favorites");
      if (data.success) {
        setFavoriteMovies(data.movies);
        syncFavoriteRefs(data.movies);
      }
    } catch (error) {
      console.error("syncFavorites error:", error);
    }
  };

  // ---- Favorite toggle: instant UI, debounced network ----
  // Mục tiêu: bấm tim liên tục bao nhiêu lần cũng được, UI đổi ngay mỗi
  // lần bấm, KHÔNG bị chặn/disable giữa chừng — nhưng network chỉ gửi
  // đúng 1 request sau khi người dùng NGỪNG bấm ~500ms, và nếu bấm số
  // chẵn lần (quay lại đúng trạng thái ban đầu) thì không gửi request
  // nào cả, tránh toggle thừa trên server.
  //
  // - favoriteIdsRef: trạng thái hiển thị hiện tại (đổi ngay mỗi lần bấm)
  // - confirmedIdsRef: trạng thái server đã xác nhận lần gần nhất
  // - so sánh 2 cái này lúc debounce "chốt" để quyết định có cần gọi API
  //   hay không, và gọi đúng 1 lần dù bấm bao nhiêu lần đi nữa.
  const favoriteIdsRef = useRef(new Set());
  const confirmedIdsRef = useRef(new Set());
  const favoriteDebounceTimers = useRef(new Map());
  const favoriteRequestToken = useRef(new Map());

  const syncFavoriteRefs = (movies) => {
    const ids = new Set(movies.map((m) => m._id));
    favoriteIdsRef.current = new Set(ids);
    confirmedIdsRef.current = new Set(ids);
  };

  const toggleFavorite = (movieId, movieObj) => {
    const isCurrentlyFav = favoriteIdsRef.current.has(movieId);

    // Đổi UI ngay lập tức — không có điều kiện chặn nào cả, bấm bao nhiêu
    // lần cũng phản hồi tức thì từng lần một.
    if (isCurrentlyFav) {
      favoriteIdsRef.current.delete(movieId);
      setFavoriteMovies((prev) => prev.filter((m) => m._id !== movieId));
    } else {
      favoriteIdsRef.current.add(movieId);
      if (movieObj) {
        setFavoriteMovies((prev) => [...prev, movieObj]);
      }
    }

    // Toast hiện NGAY lúc bấm, đồng bộ với thời điểm click — không đợi
    // network/debounce. Dùng chung 1 "id" nên bấm liên tục chỉ thay thế
    // nội dung toast hiện có (luôn phản ánh đúng lần bấm gần nhất) thay vì
    // chồng chất toast mới. Toast lỗi (nếu request sau đó thất bại) được
    // xử lý riêng trong commitFavoriteToggle, vì lúc bấm chưa thể biết
    // trước request có thành công hay không.
    toast.success(
      isCurrentlyFav ? "Removed from favorites" : "Added to favorites",
      {
        id: "favorite-toggle",
        style: { background: "#000", color: "#fff" },
        iconTheme: { primary: "#fff", secondary: "#000" },
      },
    );

    // Debounce phần gọi API: mỗi lần bấm sẽ huỷ hẹn giờ cũ và đặt lại từ
    // đầu — chỉ khi người dùng ngừng bấm trong 500ms mới thực sự "chốt"
    // và gọi API đúng 1 lần, thay vì gửi 1 request cho mỗi cú click.
    const existingTimer = favoriteDebounceTimers.current.get(movieId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      favoriteDebounceTimers.current.delete(movieId);
      commitFavoriteToggle(movieId);
    }, 500);
    favoriteDebounceTimers.current.set(movieId, timer);
  };

  const commitFavoriteToggle = async (movieId) => {
    const wantFavorited = favoriteIdsRef.current.has(movieId);
    const isConfirmedFavorited = confirmedIdsRef.current.has(movieId);

    // Trạng thái cuối cùng (sau khi ngừng bấm) trùng với trạng thái server
    // đã xác nhận lần gần nhất → không cần gọi API (ví dụ bấm 2, 4, 6...
    // lần rồi dừng, quay đúng về trạng thái ban đầu, net thay đổi = 0).
    if (wantFavorited === isConfirmedFavorited) return;

    // Token để phát hiện + bỏ qua response "cũ" nếu có nhiều request chồng
    // lấn theo cách nào đó (an toàn phòng hờ race condition).
    const token = (favoriteRequestToken.current.get(movieId) || 0) + 1;
    favoriteRequestToken.current.set(movieId, token);

    try {
      const authApi = await authorizedApi(getToken);
      const { data } = await authApi.post("/api/user/update-favorite", {
        movieId,
      });

      if (favoriteRequestToken.current.get(movieId) !== token) return;
      if (!data.success) throw new Error(data.message);

      confirmedIdsRef.current = new Set(data.movies.map((m) => m._id));
      favoriteIdsRef.current = new Set(data.movies.map((m) => m._id));
      setFavoriteMovies(data.movies);

      // Toast thành công đã hiện ngay lúc bấm (xem toggleFavorite ở trên)
      // — không toast lại ở đây nữa để tránh lặp/nháy lại cùng nội dung.
    } catch (error) {
      if (favoriteRequestToken.current.get(movieId) !== token) return;
      console.error("toggleFavorite error:", error);
      toast.error("Failed to update favorite. Please try again.", {
        id: "favorite-toggle",
        style: { background: "#000", color: "#fff" },
        iconTheme: { primary: "#fff", secondary: "#000" },
      });
      // Đồng bộ lại đúng trạng thái thật từ server khi có lỗi, thay vì tự
      // đoán rollback (an toàn hơn vì có thể đã bấm nhiều lần trong lúc chờ).
      syncFavorites();
    }
  };

  // ================== CONTEXT VALUE ==================
  const value = {
    axios,
    user,
    isLoaded,
    isSignedIn,
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
