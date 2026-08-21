import { useEffect, useState } from "react";
import Loading from "@/components/common/Loading";
import BlurCircle from "@/components/common/BlurCircle";
import api, { authorizedApi } from "@/utils/api";
import { useAppContext } from "@/context/AppContext";
import { Sparkles, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useClerk } from "@clerk/clerk-react";

export default function Recommend() {
  const { getToken, isLoaded, isSignedIn } = useAppContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState(null);
  const { openSignIn } = useClerk();

  // Gọi qua backend proxy thay vì thẳng TMDB — xem giải thích trong
  // tmdbController.js (server).
  const TMDB_BASE = "/api/tmdb";

  const fetchPoster = async (title) => {
    try {
      const res = await api.get(`${TMDB_BASE}/search/movie`, {
        params: { query: title },
      });
      const movie = res.data.results?.[0];
      return movie?.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null;
    } catch (err) {
      console.error(
        "TMDB fetch error:",
        err.response?.status,
        err.response?.data,
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
          })),
        );

        setRecommendations(recsWithPosters);
        sessionStorage.setItem(
          "recommendations",
          JSON.stringify(recsWithPosters),
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
    // validateStatus: không throw exception cho 404 — phim không có trong DB là
    // trường hợp bình thường (coming soon), không phải lỗi thật sự.
    const { data } = await api.get("/api/show/search", {
      params: { q: rec.title },
      validateStatus: (status) => status < 500,
    });

    if (data.success && data.movie?._id) {
      navigate(`/movies/${data.movie._id}`);
    } else {
      navigate(`/movies/coming-soon/${encodeURIComponent(rec.title)}`);
    }
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
  };

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    const cached = sessionStorage.getItem("recommendations");
    if (cached) {
      setRecommendations(JSON.parse(cached));
      setLoading(false);
    } else {
      fetchRecommendations();
    }
  }, [isLoaded, isSignedIn]);

  if (loading) return <Loading text="Finding your next favorite movies..." />;
  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-white">
        <h2 className="mb-3 text-2xl font-bold">🔒 Login Required</h2>
        <p className="mb-6 text-center text-gray-400">
          Please sign in to receive personalized movie recommendations powered
          by AI.
        </p>

        <button
          onClick={() => openSignIn()}
          className="px-6 py-2 rounded-full cursor-pointer bg-primary hover:bg-primary/80"
        >
          Login
        </button>
      </div>
    );
  }

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
          onClick={() => {
            if (!isSignedIn) {
              toast.error(
                "You need to be signed in to refresh recommendations.",
              );
              openSignIn();
              return;
            }
            fetchRecommendations(true);
          }}
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
                Buy Tickets
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
