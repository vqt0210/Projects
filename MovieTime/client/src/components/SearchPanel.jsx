import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SearchPanel({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      const API_URL = import.meta.env.VITE_BASE_URL
      const res = await fetch(`${API_URL}/api/search?q=${query}`)
      const data = await res.json();
      setResults(data.results || []);
      setLoading(false);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
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
          {loading && <p className="mt-4 text-sm text-gray-400">Searching...</p>}

          {/* Results */}
          <div className="mt-4 flex flex-col gap-3">
            {results.length > 0
              ? results.map((movie) => (
                  <div
                    key={movie._id}
                    onClick={() => {
                      //Đóng panel
                      onClose();

                      //Reset input (cho sạch)
                      setQuery("");

                      // Scroll lên top (ngay lập tức, để tránh flicker khi vào trang mới)
                      window.scrollTo({ top: 0, behavior: "smooth" });

                      // Điều hướng sau 200ms (đợi animation đóng)
                      setTimeout(() => {
                        navigate(`/movies/${movie._id}`);
                      }, 200);
                    }}
                    className="flex items-center gap-3 bg-white/5 p-3 rounded-md hover:bg-white/10 cursor-pointer transition"
                  >
                    <img
                      src={
                        movie.poster_path
                          ? `https://image.tmdb.org/t/p/w92${movie.poster_path}`
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
                ))
              : !loading &&
                query.length >= 2 && (
                  <p className="text-sm text-gray-400">
                    Không tìm thấy kết quả.
                  </p>
                )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
