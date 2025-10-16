import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Trash2, Film, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";

export default function SearchPanel({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const navigate = useNavigate();
  const { image_base_url } = useAppContext();

  // Load history từ localStorage
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("searchHistory")) || [];
    setHistory(saved);
  }, []);

  // Debounce search
  useEffect(() => {
    if (query.trim().length < 2) {
      setData(null);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        setLoading(true);
        const API_URL = import.meta.env.VITE_BASE_URL;
        const res = await fetch(`${API_URL}/api/search?q=${query}`);
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [query]);

  // Lưu lịch sử (giữ tối đa 10)
  const saveHistory = (item) => {
    const saved = JSON.parse(localStorage.getItem("searchHistory")) || [];
    const updated = [
      item,
      ...saved.filter((i) => i.id !== item.id && i.term !== item.term),
    ].slice(0, 10);
    localStorage.setItem("searchHistory", JSON.stringify(updated));
    setHistory(updated);
  };

  // Xoá từng mục
  const deleteHistoryItem = (termOrId) => {
    const updated = history.filter(
      (i) => i.term !== termOrId && i.id !== termOrId
    );
    setHistory(updated);
    localStorage.setItem("searchHistory", JSON.stringify(updated));
  };

  // Xoá toàn bộ
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("searchHistory");
  };

  // Khi nhấn Enter
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && query.trim().length > 1) {
      saveHistory({ type: "query", term: query });
    }
  };

  // Khi click vào phim / diễn viên
  const handleNavigate = (item, type) => {
    const entry =
      type === "movie"
        ? {
            type: "movie",
            id: item._id,
            name: item.title,
            image: item.poster_path
              ? `${image_base_url}${item.poster_path}`
              : null,
          }
        : {
            type: "actor",
            id: item.id,
            name: item.name,
            image: item.profile_path
              ? `${image_base_url}${item.profile_path}`
              : null,
          };

    saveHistory(entry);
    onClose();
    setQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      navigate(type === "actor" ? `/actors/${item.id}` : `/movies/${item._id}`);
    }, 200);
  };

  // Reset khi đóng
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setData(null);
    }
  }, [isOpen]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed top-0 right-0 h-full w-full sm:w-1/2 bg-black/70 backdrop-blur-md z-50 p-6 text-white overflow-y-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Search className="w-5 h-5" /> Search
            </h2>
            <button onClick={onClose}>
              <X className="w-6 h-6 hover:text-red-400 transition cursor-pointer" />
            </button>
          </div>

          {/* Input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Find movies or actors..."
            className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />

          {/* Lịch sử tìm kiếm */}
          {!query && history.length > 0 && (
            <div className="mt-5">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-400">Recent Searches</p>
                <button
                  onClick={clearHistory}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear All
                </button>
              </div>

              <motion.div layout className="space-y-3">
                <AnimatePresence>
                  {history.map((item) => (
                    <motion.div
                      key={item.id || item.term}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors duration-200 p-3 rounded-lg cursor-pointer"
                      onClick={() => {
                        if (item.type === "movie")
                          navigate(`/movies/${item.id}`);
                        else if (item.type === "actor")
                          navigate(`/actors/${item.id}`);
                        else setQuery(item.term);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name || item.term}
                            className="w-10 h-14 rounded-md object-cover"
                          />
                        ) : (
                          <div className="w-10 h-14 flex items-center justify-center bg-gray-800 rounded-md">
                            {item.type === "actor" ? (
                              <User className="w-5 h-5 text-gray-400" />
                            ) : item.type === "movie" ? (
                              <Film className="w-5 h-5 text-gray-400" />
                            ) : (
                              <Search className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-white">
                            {item.name || item.term}
                          </p>
                          <p className="text-xs text-gray-400 capitalize">
                            {item.type}
                          </p>
                        </div>
                      </div>
                      <X
                        className="w-4 h-4 text-gray-400 hover:text-red-400 transition cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoryItem(item.term || item.id);
                        }}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <p className="mt-4 text-sm text-gray-400">Searching...</p>
          )}

          {/* Results */}
          {/* Movies only */}
          {!loading && data?.type === "movie" && (
            <div className="mt-4 space-y-5">
              <h3 className="text-lg font-semibold text-white">Movies</h3>
              {data.results.map((movie) => (
                <div
                  key={movie._id}
                  onClick={() => handleNavigate(movie, "movie")}
                  className="flex items-center gap-3 bg-white/5 p-3 rounded-md hover:bg-white/10 cursor-pointer transition-colors duration-200"
                >
                  <img
                    src={
                      movie.poster_path
                        ? `${image_base_url}${movie.poster_path}`
                        : "/placeholder.png"
                    }
                    className="w-12 h-16 object-cover rounded"
                  />
                  <div>
                    <p className="font-medium">{movie.title}</p>
                    <p className="text-xs text-gray-400">
                      {movie.release_date?.slice(0, 4)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actors only */}
          {!loading && data?.type === "actor" && (
            <div className="mt-4 space-y-5">
              <h3 className="text-lg font-semibold text-white">Actors</h3>
              {data.profiles.map((actor) => (
                <div
                  key={actor.id}
                  onClick={() => handleNavigate(actor, "actor")}
                  className="flex items-center gap-3 bg-white/5 p-3 rounded-md hover:bg-white/10 cursor-pointer transition-colors duration-200"
                >
                  <img
                    src={
                      actor.profile_path
                        ? `${image_base_url}${actor.profile_path}`
                        : "/assets/defaultprofilepic.jpg"
                    }
                    className="w-12 h-12 object-cover rounded-full"
                  />
                  <div>
                    <p className="font-medium">{actor.name}</p>
                    <p className="text-xs text-gray-400">
                      {actor.known_for_department || "Actor"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cả hai */}
          {!loading && data?.type === "both" && (
            <div className="mt-4 space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Movies
                </h3>
                {data.movies.map((movie) => (
                  <div
                    key={movie._id}
                    onClick={() => handleNavigate(movie, "movie")}
                    className="flex items-center gap-3 bg-white/5 p-3 rounded-md hover:bg-white/10 cursor-pointer transition-colors duration-200"
                  >
                    <img
                      src={
                        movie.poster_path
                          ? `${image_base_url}${movie.poster_path}`
                          : "/placeholder.png"
                      }
                      className="w-12 h-16 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium">{movie.title}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Actors
                </h3>
                {data.profiles.map((actor) => (
                  <div
                    key={actor.id}
                    onClick={() => handleNavigate(actor, "actor")}
                    className="flex items-center gap-3 bg-white/5 p-3 rounded-md hover:bg-white/10 cursor-pointer transition-colors duration-200"
                  >
                    <img
                      src={
                        actor.profile_path
                          ? `${image_base_url}${actor.profile_path}`
                          : "/assets/defaultprofilepic.jpg"
                      }
                      className="w-12 h-12 object-cover rounded-full"
                    />
                    <div>
                      <p className="font-medium">{actor.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
