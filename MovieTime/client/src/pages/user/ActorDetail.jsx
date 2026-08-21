import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, CakeIcon, Calendar, CandlestickChart } from "lucide-react";
import MovieCard from "@/components/movies/MovieCard";
import Loading from "@/components/common/Loading";
import { useAppContext } from "@/context/AppContext";

export default function ActorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [actor, setActor] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const { image_base_url } = useAppContext();

  useEffect(() => {
    const fetchActor = async () => {
      try {
        // Gọi qua backend proxy thay vì thẳng TMDB — xem giải thích trong
        // tmdbController.js (server). Dùng VITE_BASE_URL (trỏ về server
        // của chính app) thay vì domain TMDB.
        const TMDB_BASE = `${import.meta.env.VITE_BASE_URL}/api/tmdb`;

        // Fetch thông tin diễn viên
        const actorRes = await fetch(`${TMDB_BASE}/person/${id}`);

        if (!actorRes.ok) {
          const errorData = await actorRes.json();
          console.error("TMDB error:", actorRes.status, errorData);
          throw new Error(errorData.status_message || "TMDB request failed");
        }

        const actorData = await actorRes.json();

        // Nếu không có diễn viên
        if (actorData.success === false) {
          setActor(null);
          setLoading(false);
          return;
        }

        setActor(actorData);

        // Fetch phim liên quan
        const moviesRes = await fetch(
          `${TMDB_BASE}/person/${id}/movie_credits`,
        );
        const moviesData = await moviesRes.json();

        // Lọc bỏ phim thiếu thông tin
        const filtered = (moviesData.cast || []).filter(
          (m) => m.poster_path && (m.overview || m.vote_average > 0),
        );

        // Lấy tối đa 12 phim sau khi lọc
        setMovies(filtered.slice(0, 12));
      } catch (err) {
        console.error("Fetch actor failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchActor();
  }, [id]);

  if (loading) return <Loading />;

  if (!actor)
    return <p className="mt-10 text-center text-gray-400">Actor not found</p>;

  return (
    <div className="px-6 text-white md:px-16 lg:px-40 pt-28 md:pt-40">
      {/* Header */}
      <button
        onClick={() => {
          navigate(-1);
          scrollTo(0, 0);
        }}
        className="flex items-center gap-2 mb-6 text-gray-400 transition cursor-pointer hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Actor info */}
      <div className="flex flex-col gap-8">
        {/* Container Nội dung chính: Ảnh (trái) và Thông tin chi tiết (phải) */}
        <div className="flex flex-col items-start gap-8 md:flex-row">
          <img
            src={
              actor.profile_path
                ? `${image_base_url}${actor.profile_path}`
                : "/assets/defaultprofilepic.jpg"
            }
            onError={(e) => (e.target.src = "/assets/defaultprofilepic.jpg")}
            alt={actor.name}
            className="flex-shrink-0 object-cover bg-gray-800 rounded-full w-44 h-44"
          />

          {/* Khối Thông tin (Tên, Ngày sinh, Nghề nghiệp...) */}
          <div className="flex flex-col mt-2 md:mt-0">
            <h1 className="mb-2 text-3xl font-bold text-white">{actor.name}</h1>

            <p className="flex items-center gap-1 text-sm text-gray-400">
              <CakeIcon className="w-4 h-4 text-gray-400" />{" "}
              {actor.birthday || "Unknown"} • {actor.place_of_birth || "N/A"}
            </p>

            <p className="mt-1 text-gray-400">{actor.known_for_department}</p>
            <p className="mt-2 text-sm text-gray-500">
              Popularity: {actor.popularity?.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Tiểu sử (Nằm riêng biệt, bên ngoài Flex-row trên, để luôn nằm dưới cùng) */}
        <p className="max-w-full leading-relaxed text-justify text-gray-300">
          {actor.biography || "No biography available."}
        </p>
      </div>

      {/* Related movies */}
      <h2 className="mt-12 mb-6 text-xl font-semibold">
        Movies with {actor.name}
      </h2>
      <div className="flex flex-wrap gap-8 max-sm:justify-center">
        {movies.map((m, idx) => (
          <MovieCard key={idx} movie={m} />
        ))}
      </div>
    </div>
  );
}
