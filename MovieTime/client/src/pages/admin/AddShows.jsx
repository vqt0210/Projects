import { useEffect, useState, useRef } from "react";
import Loading from "@/components/common/Loading";
import Title from "@/components/admin/layout/Title";
import { CheckIcon, DeleteIcon, StarIcon } from "lucide-react";
import { kConverter } from "@/lib/kConverter";
import { useAppContext } from "@/context/AppContext";
import { authorizedApi } from "@/utils/api";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const AddShows = () => {
  const { getToken, user, image_base_url } = useAppContext();
  const currency = import.meta.env.VITE_CURRENCY;

  const [nowPlayingMovies, setNowPlayingMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [dateTimeSelection, setDateTimeSelection] = useState({});
  const [dateTimeInput, setDateTimeInput] = useState("");
  const [showPrice, setShowPrice] = useState("");
  const [addingShow, setAddingShow] = useState(false);

  const dateTimeInputRef = useRef(null);

  // Fetch now playing movies
  const fetchNowPlayingMovies = async () => {
    try {
      const api = await authorizedApi(getToken);
      const { data } = await api.get("/api/show/now-playing");

      if (data.success) setNowPlayingMovies(data.movies);
      else toast.error(data.message);
    } catch (err) {
      console.error("Error fetching movies:", err);
      toast.error("Failed to fetch now playing movies.");
    }
  };

  // Add show
  const handleSubmit = async () => {
    if (
      !selectedMovie ||
      !showPrice ||
      Object.keys(dateTimeSelection).length === 0
    ) {
      toast.error("Missing required fields");
      return;
    }

    const showsInput = Object.entries(dateTimeSelection).flatMap(
      ([date, times]) => times.map((time) => ({ date, time }))
    );

    const MySwal = withReactContent(Swal);
    const confirm = await MySwal.fire({
      title: "Confirm Add Show",
      text: `Add ${showsInput.length} showtime${
        showsInput.length > 1 ? "s" : ""
      } for this movie?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, add now",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#f84565",
      background: "#1e1e1e",
      color: "#fff",
      customClass: {
        popup: "rounded-xl shadow-lg",
        confirmButton:
          "px-5 py-2 rounded-lg font-semibold bg-gradient-to-r from-primary to-pink-600 hover:shadow-[0_0_10px_#f84565] transition-all",
        cancelButton:
          "px-5 py-2 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600 transition-all",
      },
    });

    if (!confirm.isConfirmed) return;

    const payload = {
      movieId: selectedMovie,
      showsInput,
      showPrice: Number(showPrice),
    };

    try {
      const loadingAlert = MySwal.fire({
        title: "Adding new show...",
        text: "Please wait while we process your request.",
        background: "#1e1e1e",
        color: "#fff",
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          MySwal.showLoading();
        },
      });

      setAddingShow(true);
      const api = await authorizedApi(getToken);
      const { data } = await api.post("/api/show/add", payload);

      MySwal.close();

      if (data.success) {
        toast.success(data.message);
        setSelectedMovie(null);
        setDateTimeSelection({});
        setShowPrice("");
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      MySwal.close();
      console.error("Add show error:", err);
      toast.error("Failed to add show.");
    } finally {
      setAddingShow(false);
    }
  };

  const handleDateTimeAdd = () => {
    if (!dateTimeInput) return;
    const [date, time] = dateTimeInput.split("T");
    if (!date || !time) return;

    setDateTimeSelection((prev) => {
      const times = prev[date] ? [...prev[date]] : [];
      if (times.includes(time)) return prev;
      return { ...prev, [date]: [...times, time].sort() };
    });
    setDateTimeInput("");
    dateTimeInputRef.current?.focus();
  };

  const handleRemoveTime = (date, time) => {
    setDateTimeSelection((prev) => {
      const filtered = (prev[date] || []).filter((t) => t !== time);
      if (!filtered.length) {
        const { [date]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [date]: filtered };
    });
  };

  useEffect(() => {
    if (user && getToken) fetchNowPlayingMovies();
  }, [user]);

  if (!nowPlayingMovies.length) return <Loading />;

  return (
    <>
      <Title text1="Add" text2="Shows" />
      <p className="mt-10 text-lg font-medium">Now Playing Movies</p>
      <div className="pb-4 overflow-x-auto">
        <div className="flex flex-wrap gap-4 mt-4 group w-max">
          {nowPlayingMovies.map((movie) => (
            <div
              key={movie.id}
              className="relative w-40 transition duration-300 cursor-pointer group-hover:not-hover:opacity-40 hover:-translate-y-1"
              onClick={() =>
                setSelectedMovie((prev) =>
                  prev === movie.id ? null : movie.id
                )
              }
            >
              <div className="relative overflow-hidden rounded-lg">
                <img
                  src={image_base_url + movie.poster_path}
                  alt={movie.title}
                  className="object-cover w-full brightness-90"
                />
                <div className="absolute bottom-0 left-0 flex items-center justify-between w-full p-2 text-sm bg-black/70">
                  <p className="flex items-center gap-1 text-gray-400">
                    <StarIcon className="w-4 h-4 text-primary fill-primary" />{" "}
                    {movie.vote_average.toFixed(1)}
                  </p>
                  <p className="text-gray-300">
                    {kConverter(movie.vote_count)} Votes
                  </p>
                </div>
              </div>
              {selectedMovie === movie.id && (
                <div className="absolute flex items-center justify-center w-6 h-6 rounded top-2 right-2 bg-primary">
                  <CheckIcon className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
              )}
              <p className="font-medium truncate">{movie.title}</p>
              <p className="text-sm text-gray-400">{movie.release_date}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Price Input */}
      <div className="mt-8">
        <label className="block mb-2 text-sm font-medium">Show Price</label>
        <div className="inline-flex items-center gap-2 px-3 py-2 border border-gray-600 rounded-md">
          <p className="text-sm text-gray-400">{currency}</p>
          <input
            min={0}
            type="number"
            value={showPrice}
            onChange={(e) => setShowPrice(e.target.value)}
            placeholder="Enter show price"
            className="px-3 py-2 text-white border border-gray-700 rounded-md outline-none bg-gray-900/70 placeholder:text-gray-400 focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Date-Time Input */}
      <div className="mt-6">
        <label className="block mb-2 text-sm font-medium">
          Select Date and Time
        </label>
        <div className="inline-flex gap-5 p-1 pl-3 border border-gray-600 rounded-lg">
          <input
            type="datetime-local"
            min={new Date().toISOString().slice(0, 16)}
            ref={dateTimeInputRef}
            value={dateTimeInput}
            onChange={(e) => setDateTimeInput(e.target.value)}
            className="rounded-md outline-none"
          />
          <button
            onClick={handleDateTimeAdd}
            className="bg-gradient-to-r from-primary to-pink-600 text-white px-3 py-2 text-sm rounded-lg hover:shadow-[0_0_10px_#f84565] transition-all cursor-pointer"
          >
            Add Time
          </button>
        </div>
      </div>

      {/* Selected Times */}
      {Object.keys(dateTimeSelection).length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2">Selected Date-Time</h2>
          <ul className="space-y-3">
            {Object.entries(dateTimeSelection).map(([date, times]) => (
              <li key={date}>
                <div className="font-medium">{date}</div>
                <div className="flex flex-wrap gap-2 mt-1 text-sm">
                  {times.map((time) => (
                    <div
                      key={time}
                      className="flex items-center px-2 py-1 border rounded border-primary"
                    >
                      <span>{time}</span>
                      <DeleteIcon
                        onClick={() => handleRemoveTime(date, time)}
                        width={15}
                        className="ml-2 text-red-500 cursor-pointer hover:text-red-700"
                      />
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={addingShow}
        className="px-8 py-2 mt-6 text-white transition-all rounded cursor-pointer bg-primary hover:bg-primary/90"
      >
        {addingShow ? "Adding..." : "Add Show"}
      </button>
    </>
  );
};

export default AddShows;
