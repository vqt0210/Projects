import { useState } from "react";
import { authorizedApi } from "@/utils/api";
import { useAppContext } from "@/context/AppContext";
import { dateFormat } from "@/lib/dateFormat";
import { StarIcon, Clock, DollarSign } from "lucide-react";
import toast from "react-hot-toast";

export default function EditShows({ shows, refreshDashboard }) {
  const { getToken, image_base_url } = useAppContext();
  const currency = import.meta.env.VITE_CURRENCY;

  const [editingShow, setEditingShow] = useState(null);
  const [deletingShow, setDeletingShow] = useState(null);
  const [newTime, setNewTime] = useState("");
  const [newPrice, setNewPrice] = useState("");

  // === Update show ===
  const handleUpdate = async () => {
    try {
      const api = await authorizedApi(getToken);
      const payload = {};
      if (newTime) payload.showDateTime = newTime;
      if (newPrice) payload.showPrice = { adult: parseFloat(newPrice) };

      const { data } = await api.patch(
        `/api/admin/update-show/${editingShow._id}`,
        payload
      );
      if (data.success) {
        toast.success("Show updated successfully!");
        refreshDashboard();
        setEditingShow(null);
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error updating show");
    }
  };

  // === Delete show ===
  const handleDelete = async (show, force = false) => {
    try {
      const api = await authorizedApi(getToken);
      const { data } = await api.delete(
        `/api/admin/delete-show/${show._id}`,
        { data: { force } }
      );

      if (data.success) {
        toast.success(data.message);
        refreshDashboard();
        setDeletingShow(null);
      } else if (data.message?.includes("users already booked")) {
        // force confirm dialog
        const confirmForce = window.confirm(
          "⚠️ This show has active bookings.\nDo you want to cancel it and notify users?"
        );
        if (confirmForce) await handleDelete(show, true);
      } else {
        toast.error(data.message || "Error deleting show");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error deleting show");
    }
  };

  return (
    <div className="relative flex flex-wrap gap-6 mt-5 max-w-6xl">
      {shows?.map((show) => (
        <div
          key={show._id}
          className="w-55 rounded-lg overflow-hidden h-full pb-3 bg-primary/10 border border-primary/20 hover:-translate-y-1 hover:shadow-primary/20 transition duration-300"
        >
          <img
            src={image_base_url + show.movie.poster_path}
            alt={show.movie.title}
            loading="lazy"
            className="h-60 w-full object-cover"
          />
          <div className="p-3">
            <p className="font-medium truncate text-white">
              {show.movie.title}
            </p>
            <div className="flex items-center justify-between mt-2 text-gray-300">
              <p className="text-sm">
                {currency}{" "}
                {typeof show.showPrice === "object"
                  ? show.showPrice.adult || 0
                  : show.showPrice || 0}
              </p>
              <div className="flex items-center gap-1">
                <StarIcon className="w-4 h-4 text-primary fill-primary" />
                <span className="text-sm">
                  {show.movie.vote_average?.toFixed(1) || "0.0"}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {dateFormat(show.showDateTime)}
            </p>

            {/* Edit & Delete Buttons */}
            <div className="flex justify-between mt-3">
              <button
                onClick={() => {
                  setEditingShow(show);
                  setNewTime("");
                  setNewPrice("");
                }}
                className="px-3 py-1 text-sm bg-primary/80 hover:bg-primary text-white rounded cursor-pointer"
              >
                ✏ Edit
              </button>
              <button
                onClick={() => setDeletingShow(show)}
                className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded cursor-pointer"
              >
                🗑 Delete
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* === Edit Modal === */}
      {editingShow && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="bg-gray-900 p-6 rounded-xl border border-primary/20 w-[420px] shadow-lg relative">
            <h2 className="text-xl font-semibold mb-5 text-white text-center border-b border-gray-700 pb-2">
              Edit Show — {editingShow.movie.title}
            </h2>

            {/* Show info */}
            <div className="flex items-center gap-3 mb-4">
              <img
                src={image_base_url + editingShow.movie.poster_path}
                alt={editingShow.movie.title}
                className="w-16 h-20 rounded-lg object-cover border border-gray-700"
              />
              <div>
                <p className="text-gray-300 text-sm">
                  Current Time:{" "}
                  <span className="text-primary">
                    {dateFormat(editingShow.showDateTime)}
                  </span>
                </p>
                <p className="text-gray-300 text-sm">
                  Current Price:{" "}
                  <span className="text-primary">
                    {currency}{" "}
                    {editingShow.showPrice?.adult ||
                      editingShow.showPrice ||
                      0}
                  </span>
                </p>
              </div>
            </div>

            {/* Input Fields */}
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <Clock className="w-4 h-4" /> New Showtime
                </label>
                <input
                  type="datetime-local"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <DollarSign className="w-4 h-4" /> New Price
                </label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setEditingShow(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-white cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === Delete Modal === */}
      {deletingShow && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 w-[400px] text-center shadow-lg">
            <h2 className="text-xl font-semibold mb-3 text-red-400">
              ⚠ Confirm Delete
            </h2>
            <p className="text-gray-300 mb-5">
              Delete <strong>{deletingShow.movie.title}</strong>?  
              <br />This action cannot be undone.
            </p>

            <div className="flex justify-around">
              <button
                onClick={() => setDeletingShow(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingShow)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white cursor-pointer"
              >
                🗑 Delete Show
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
