import { useEffect, useState } from "react";
import Loading from "@/components/common/Loading";
import BlurCircle from "@/components/common/BlurCircle";
import { authorizedApi } from "@/utils/api";
import { useAppContext } from "@/context/AppContext";
import { Sparkles, RefreshCw } from "lucide-react";
import axios from "axios";

export default function Recommend() {
  const { getToken } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState(null);

  const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;
  const TMDB_BASE = "https://api.themoviedb.org/3";

  // Hàm lấy ảnh poster từ TMDB theo title
  const fetchPoster = async (title) => {
    try {
      const res = await axios.get(`${TMDB_BASE}/search/movie`, {
        params: { api_key: TMDB_KEY, query: title },
      });
      const movie = res.data.results?.[0];
      return movie?.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null;
    } catch {
      return null;
    }
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const authApi = await authorizedApi(getToken);
      const { data } = await authApi.get("/api/recommendation");
      if (data.success) {
        // Lấy thêm ảnh từ TMDB
        const recsWithPosters = await Promise.all(
          (data.recommendations || []).map(async (rec) => ({
            ...rec,
            poster: await fetchPoster(rec.title),
          }))
        );
        setRecommendations(recsWithPosters);
      } else {
        setError(data.message || "Failed to load recommendations");
      }
    } catch (err) {
      console.error("Fetch recommend error:", err);
      setError("AI recommendation service unavailable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  if (loading) return <Loading text="Finding your next favorite movies..." />;

  return (
    <div className="relative min-h-screen px-6 pt-32 pb-24 overflow-hidden text-white md:px-16 lg:px-24 xl:px-32">
      {/* Background effects */}
      <BlurCircle top="100px" left="50px" />
      <BlurCircle bottom="200px" right="100px" />
      <BlurCircle bottom="300px" left="40%" />

      {/* Header */}
      <div className="flex items-center justify-between max-w-5xl mx-auto mb-10">
        <h1 className="flex items-center gap-3 text-2xl font-bold md:text-3xl text-primary">
          <Sparkles className="text-yellow-400" />
          Movie Recommendations
        </h1>
        <button
          onClick={fetchRecommendations}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-lg cursor-pointer bg-primary hover:bg-primary/80"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Error */}
      {error && <p className="mb-6 text-center text-red-400">{error}</p>}

      {/* Recommendations list */}
      {recommendations.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 mt-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="relative group rounded-2xl overflow-hidden bg-[#111]/60 backdrop-blur-md border border-white/10 hover:border-primary transition-all duration-500 shadow-[0_0_25px_rgba(248,69,101,0.2)] hover:shadow-[0_0_35px_rgba(248,69,101,0.4)] animate-fadeInUp"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              {/* Poster */}
              {rec.poster ? (
                <img
                  src={rec.poster}
                  alt={rec.title}
                  className="object-cover w-full transition duration-300 h-72 opacity-80 group-hover:opacity-100"
                />
              ) : (
                <div className="flex items-center justify-center w-full text-sm text-gray-500 h-72 bg-gradient-to-br from-gray-800 to-gray-900">
                  No image
                </div>
              )}

              {/* Overlay content */}
              <div className="absolute inset-0 flex flex-col justify-end p-5 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                <h3 className="mb-2 text-xl font-bold transition text-primary group-hover:text-pink-400">
                  {rec.title}
                </h3>
                <p className="mb-2 text-sm leading-relaxed text-gray-200 line-clamp-3">
                  {rec.description}
                </p>
                <p className="text-[13px] italic text-gray-400">
                  🎯 <span className="text-pink-400">{rec.reason}</span>
                </p>
              </div>
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
