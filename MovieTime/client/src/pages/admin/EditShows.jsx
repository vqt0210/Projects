import { useState } from "react";
import { authorizedApi } from "@/utils/api";
import { useAppContext } from "@/context/AppContext";
import { dateFormat } from "@/lib/dateFormat";
import { StarIcon, Clock, DollarSign, XIcon } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@/components/ui/dialog";

const MySwal = withReactContent(Swal);

export default function EditShows({ shows, refreshDashboard }) {
  const { getToken, image_base_url } = useAppContext();
  const currency = import.meta.env.VITE_CURRENCY;

  const [editingShow, setEditingShow] = useState(null);
  const [newTime, setNewTime] = useState("");
  const [newPrice, setNewPrice] = useState("");

  // Update show
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

  //Delete show
  const handleDelete = async (show, force = false) => {
  try {
    // Hiển thị popup trước
    const result = await MySwal.fire({
      title: "Are you sure?",
      text: `Delete "${show.movie.title}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f84565",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
      background: "#1e1e1e",
      color: "#fff",
      customClass: {
        popup: "rounded-xl shadow-lg",
        confirmButton:
          "px-5 py-2 rounded-lg font-semibold bg-gradient-to-r from-red-500 to-pink-600 hover:shadow-[0_0_10px_#f84565] transition-all",
        cancelButton:
          "px-5 py-2 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600 transition-all",
      },
    });

    if (!result.isConfirmed) return;

    // Tạo API sau khi người dùng xác nhận
    const api = await authorizedApi(getToken);

    const { data } = await api.delete(`/api/admin/delete-show/${show._id}`, {
      data: { force },
    });

    if (data.success) {
      toast.success(data.message);
      refreshDashboard();
    } else if (data.message?.includes("users already booked")) {
      const forceResult = await MySwal.fire({
        title: "⚠ Active Bookings Detected",
        text: "This show has existing bookings. Cancel it and notify users?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#f84565",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, force delete",
        background: "#1e1e1e",
        color: "#fff",
      });

      if (forceResult.isConfirmed) await handleDelete(show, true);
    } else {
      toast.error(data.message || "Error deleting show");
    }
  } catch (err) {
    toast.error(err.response?.data?.message || "Error deleting show");
  }
};

  return (
    <div className="relative flex flex-wrap max-w-6xl gap-6 mt-5">
      {shows?.map((show) => (
        <div
          key={show._id}
          className="h-full pb-3 overflow-hidden transition duration-300 border rounded-lg w-55 bg-primary/10 border-primary/20 hover:-translate-y-1 hover:shadow-primary/30"
        >
          <img
            src={image_base_url + show.movie.poster_path}
            alt={show.movie.title}
            loading="lazy"
            className="object-cover w-full h-60"
          />
          <div className="p-3">
            <p className="font-medium text-white truncate">
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
            <p className="mt-1 text-xs text-gray-500">
              {dateFormat(show.showDateTime)}
            </p>

            {/* Buttons */}
            <div className="flex justify-between mt-3">
              <Dialog
                open={editingShow?._id === show._id}
                onOpenChange={(open) => {
                  if (!open) setEditingShow(null);
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="px-4 py-2 font-medium text-white bg-gradient-to-r from-primary to-pink-600 hover:shadow-[0_0_10px_#f84565] transition-all rounded-lg cursor-pointer"
                    onClick={() => {
                      setEditingShow(show);
                      setNewTime("");
                      setNewPrice("");
                    }}
                  >
                    ✏ Edit
                  </Button>
                </DialogTrigger>

                <DialogContent
                  className="bg-[#111]/90 text-white border border-primary/30 
                  shadow-[0_0_30px_rgba(248,69,101,0.2)] sm:max-w-[440px]
                  backdrop-blur-xl rounded-2xl
                  data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-90 data-[state=open]:duration-300 
                  data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-90 data-[state=closed]:duration-200"
                >
                  <DialogHeader>
                    <div className="flex items-start justify-between pb-3 border-b border-white/10">
                      <div>
                        <DialogTitle className="text-lg font-semibold text-primary">
                          Edit Show — {show.movie.title}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-400">
                          Modify showtime or price below
                        </DialogDescription>
                      </div>

                      <DialogClose asChild>
                        <button
                          className="text-gray-400 transition cursor-pointer hover:text-white"
                          aria-label="Close"
                        >
                          <XIcon className="w-5 h-5" />
                        </button>
                      </DialogClose>
                    </div>
                  </DialogHeader>

                  {/* Movie Preview */}
                  <div className="flex items-center gap-3 mt-4 mb-4">
                    <img
                      src={image_base_url + show.movie.poster_path}
                      alt={show.movie.title}
                      className="object-cover w-16 h-20 border border-gray-700 rounded-lg shadow"
                    />
                    <div className="space-y-1 text-sm text-gray-300">
                      <p>
                        Current Time:{" "}
                        <span className="text-primary">
                          {dateFormat(show.showDateTime)}
                        </span>
                      </p>
                      <p>
                        Current Price:{" "}
                        <span className="text-primary">
                          {currency}{" "}
                          {show.showPrice?.adult || show.showPrice || 0}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2 text-gray-300">
                        <Clock className="w-4 h-4" /> New Showtime
                      </Label>
                      <Input
                        type="datetime-local"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="text-white border border-gray-700 bg-gray-900/70 placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary"
                        placeholder="Select new date & time..."
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="flex items-center gap-2 text-gray-300">
                        <DollarSign className="w-4 h-4" /> New Price
                      </Label>
                      <Input
                        type="number"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        placeholder={`Current: ${
                          show.showPrice?.adult || show.showPrice || 0
                        }`}
                        className="text-white border border-gray-700 bg-gray-900/70 placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Footer buttons */}
                  <DialogFooter className="flex justify-end gap-3 mt-6">
                    <Button
                      variant="secondary"
                      onClick={() => setEditingShow(null)}
                      className="px-4 py-2 text-white transition-all bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-[0_0_10px_#10b981] text-white px-4 py-2 rounded-lg cursor-pointer transition-all"
                      onClick={handleUpdate}
                    >
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Delete button */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDelete(show)}
                className="px-4 py-2 font-medium bg-gray-800 hover:bg-red-600 hover:shadow-[0_0_10px_#ef4444] transition-all text-white rounded-lg cursor-pointer"
              >
                🗑 Delete
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
