import { useEffect, useState } from "react";
import Loading from "@/components/common/Loading";
import BlurCircle from "@/components/common/BlurCircle";
import api, { authorizedApi } from "@/utils/api";
import { useAppContext } from "@/context/AppContext";
import { Sparkles, RefreshCw } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function Recommend() {
  const { getToken } = useAppContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState(null);

  const TMDB_BASE = "https://api.themoviedb.org/3";

  const fetchPoster = async (title) => {
    try {
      const res = await axios.get(`${TMDB_BASE}/search/movie`, {
        params: { query: title },
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_TMDB_BEARER_TOKEN}`,
          Accept: "application/json",
        },
      });
      const movie = res.data.results?.[0];
      return movie?.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null;
    } catch (err) {
      console.error(
        "TMDB fetch error:",
        err.response?.status,
        err.response?.data
      );
      return null;
    }
  };

  const fetchRecommendations = async (showToast = false) => {
    setLoading(true);
    setError(null);
    try {
      const authApi = await authorizedApi(getToken);
      const { data } = await authApi.get("/api/recommendation");

      if (data.success) {
        const recsWithPosters = await Promise.all(
          (data.recommendations || []).map(async (rec) => ({
            ...rec,
            poster: await fetchPoster(rec.title),
          }))
        );

        setRecommendations(recsWithPosters);
        sessionStorage.setItem(
          "recommendations",
          JSON.stringify(recsWithPosters)
        );

        // Chỉ toast khi người dùng bấm Refresh
        if (showToast)
          toast.success("✨ Recommendations refreshed successfully!");
      } else {
        setError(data.message || "Failed to load recommendations");
      }
    } catch (err) {
      console.error("Fetch recommend error:", err);
      setError("AI recommendation service unavailable");
      toast.error("❌ Failed to refresh recommendations");
    } finally {
      setLoading(false);
    }
  };

  const handleViewMovieSmart = async (rec) => {
    try {
      const { data } = await api.get("/api/show/search", {
        params: { q: rec.title },
      });

      if (data.success && data.movie?._id) {
        if (data.source === "local") navigate(`/movies/${data.movie._id}`);
        else navigate(`/movies/coming-soon/${encodeURIComponent(rec.title)}`);

        setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
        return;
      }

      navigate(`/movies/coming-soon/${encodeURIComponent(rec.title)}`);
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    } catch (err) {
      console.error("View movie error:", err);
      navigate(`/movies/coming-soon/${encodeURIComponent(rec.title)}`);
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    }
  };

  useEffect(() => {
    const cached = sessionStorage.getItem("recommendations");
    if (cached) {
      setRecommendations(JSON.parse(cached));
      setLoading(false);
    } else {
      fetchRecommendations();
    }
  }, []);

  if (loading) return <Loading text="Finding your next favorite movies..." />;

  return (
    <div className="relative min-h-screen px-6 pt-32 pb-24 overflow-hidden text-white md:px-16 lg:px-24 xl:px-32">
      <BlurCircle top="100px" left="50px" />
      <BlurCircle bottom="200px" right="100px" />
      <BlurCircle bottom="300px" left="40%" />

      <div className="flex items-center justify-between max-w-5xl mx-auto mb-10">
        <h1 className="flex items-center gap-3 text-2xl font-bold md:text-3xl text-primary">
          <Sparkles className="text-yellow-400" />
          Movie Recommendations
        </h1>
        <button
          onClick={() => fetchRecommendations(true)} // truyền true để hiện toast
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all cursor-pointer rounded-2xl bg-primary hover:bg-primary/80"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <p className="mb-6 text-center text-red-400">{error}</p>}

      {recommendations.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 mt-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="relative flex flex-col justify-between h-full p-5 rounded-2xl bg-gradient-to-b from-[#1a1a1a]/70 to-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 hover:border-primary transition-all duration-500 shadow-[0_0_20px_rgba(248,69,101,0.15)] hover:shadow-[0_0_30px_rgba(248,69,101,0.35)]"
            >
              <div>
                {rec.poster && (
                  <img
                    src={rec.poster}
                    alt={rec.title}
                    className="object-cover w-full rounded-xl mb-4 h-[340px]"
                  />
                )}
                <h3 className="mb-2 text-xl font-bold text-primary group-hover:text-pink-400">
                  {rec.title}
                </h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-300">
                  {rec.description}
                </p>
                <div className="pt-3 mt-4 border-t border-white/10">
                  <p className="text-[13px] italic text-gray-400">
                    🎯 <span className="text-pink-400">{rec.reason}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleViewMovieSmart(rec)}
                className="w-full px-5 py-2 mt-5 text-sm font-medium text-white transition rounded-full cursor-pointer bg-primary hover:bg-primary/80"
              >
                View Movie
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-10 text-center text-gray-400">
          No recommendations yet. Watch or favorite some movies first 🎬
        </p>
      )}
    </div>
  );
}
