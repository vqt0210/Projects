import { useEffect, useState } from 'react';
import MovieCard from '../components/MovieCard';
import Loading from '../components/Loading';
import { useAppContext } from '../context/AppContext';

export default function TopRated() {
  const { axios } = useAppContext();
  const [movies, setMovies] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTop = async () => {
      try {
        const { data } = await axios.get('/api/show/top-rated?page=1');
        const list = data?.results ?? data?.movies ?? [];
        setMovies(list);
      } catch (err) {
        console.error('TopRated fetch error', err);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTop();
  }, [axios]);

  if (loading) return <Loading />;
  return (
    <div className="px-6 md:px-16 lg:px-24">
      <h1 className="mb-6 text-2xl font-semibold">Top Rated</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {movies.map(m => <MovieCard key={m.id || m._id} movie={m} />)}
      </div>
    </div>
  );
}
