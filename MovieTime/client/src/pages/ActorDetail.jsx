import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import Loading from "../components/Loading";
import MovieCard from "../components/MovieCard";

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
        const API_URL = import.meta.env.VITE_BASE_URL;
        const res = await fetch(`${API_URL}/api/actors/${id}`);
        const data = await res.json();
        if (data.success) {
          setActor(data.actor);
          setMovies(data.movies);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchActor();
  }, [id]);

  if (loading) return <Loading />;

  if (!actor)
    return <p className="text-center mt-10 text-gray-400">Actor not found</p>;

  return (
    <div className="px-6 md:px-16 lg:px-40 pt-28 md:pt-40 text-white">
      {/* Header */}
      <button
        onClick={() => {
          navigate(-1);
          scrollTo(0, 0);
        }}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Actor info */}
      <div className="flex flex-col md:flex-row items-start gap-8">
        <img
          src={image_base_url + actor.profile_path}
          alt={actor.name}
          className="w-44 h-44 object-cover rounded-xl"
        />
        <div>
          <h1 className="text-3xl font-semibold">{actor.name}</h1>
          <p className="text-gray-400 mt-1">{actor.known_for_department}</p>
          <p className="text-gray-500 text-sm mt-2">
            Popularity: {actor.popularity}
          </p>
        </div>
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
