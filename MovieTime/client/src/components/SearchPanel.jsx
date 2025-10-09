import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export default function SearchPanel({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { image_base_url } = useAppContext();

  // debounce search
  useEffect(() => {
    if (query.trim().length < 2) {
      setData(null);
      return;
    }

    const delayDebounce = setTimeout(async () => {
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

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // reset khi đóng
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setData(null);
    }
  }, [isOpen]);

  const handleNavigate = (id, type = "movie") => {
    onClose();
    setQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      if (type === "actor") navigate(`/actors/${id}`);
      else navigate(`/movies/${id}`);
    }, 200);
  };

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
              <X className="w-6 h-6 hover:text-red-400 transition" />
            </button>
          </div>

          {/* Search input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find movies or actors..."
            className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />

          {/* Loading */}
          {loading && (
            <p className="mt-4 text-sm text-gray-400">Searching...</p>
          )}

          {/* Results */}
          {!loading && data?.type === "movie" && (
            <div className="mt-4 flex flex-col gap-3">
              {data.results.map((movie) => (
                <div
                  key={movie._id}
                  onClick={() => handleNavigate(movie._id, "movie")}
                  className="flex items-center gap-3 bg-white/5 p-3 rounded-md hover:bg-white/10 cursor-pointer transition"
                >
                  <img
                    src={
                      movie.poster_path
                        ? `${image_base_url}${movie.poster_path}`
                        : "/placeholder.png"
                    }
                    alt={movie.title}
                    className="w-12 h-16 object-cover rounded"
                  />
                  <div>
                    <p className="font-medium">{movie.title}</p>
                    <p className="text-xs text-gray-400">
                      {movie.release_date?.slice(0, 4)} •{" "}
                      {movie.genres?.map((g) => g.name).join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && data?.type === "actor" && (
            <div className="mt-4 space-y-5">
              {/* Profile info */}
              {data.profiles && data.profiles.length > 0 && (
                <div className="space-y-3">
                  {data.profiles.map((actor) => (
                    <div
                      key={actor.id}
                      className="flex items-center gap-4 bg-white/5 p-4 rounded-lg hover:bg-white/10 transition cursor-pointer"
                      onClick={() => handleNavigate(actor.id, "actor")}
                    >
                      <img
                        src={
                          actor.profile_path
                            ? `${image_base_url}${actor.profile_path}`
                            : "/assets/defaultprofilepic.jpg"
                        }
                        onError={(e) =>
                          (e.target.src = "/assets/defaultprofilepic.jpg")
                        }
                        alt={actor.name}
                        className="w-30 h-30 rounded-full object-cover bg-gray-800"
                      />
                      <div>
                        <h3 className="text-base font-semibold">
                          {actor.name}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {actor.known_for_department} • Popularity{" "}
                          {actor.popularity?.toFixed(1)}
                        </p>
                        <p className="text-xs text-red-400 cursor-pointer">
                          View profile
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Related movies */}
              <div className="space-y-3">
                <h4 className="font-semibold text-base">Movies</h4>
                {data.results.map((movie) => (
                  <div
                    key={movie._id}
                    onClick={() => handleNavigate(movie._id, "movie")}
                    className="flex items-center gap-3 bg-white/5 p-3 rounded-md hover:bg-white/10 cursor-pointer transition"
                  >
                    <img
                      src={
                        movie.poster_path
                          ? `${image_base_url}${movie.poster_path}`
                          : "/placeholder.png"
                      }
                      alt={movie.title}
                      className="w-12 h-16 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium">{movie.title}</p>
                      <p className="text-xs text-gray-400">
                        {movie.release_date?.slice(0, 4)} •{" "}
                        {movie.genres?.map((g) => g.name).join(", ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {!loading && data?.type === "none" && query.length >= 2 && (
            <p className="mt-4 text-sm text-gray-400">
              No Results. Try another name.
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
