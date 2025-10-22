import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { assets } from "@/assets/assets";
import Loading from "@/components/common/Loading";
import { ArrowRightIcon, ClockIcon } from "lucide-react";
import isoTimeFormat from "@/lib/isoTimeFormat";
import BlurCircle from "@/components/common/BlurCircle";
import toast from "react-hot-toast";
import { useAppContext } from "@/context/AppContext";
import api, { authorizedApi } from "@/utils/api";

const SeatLayout = () => {
  const seatRows = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
  const { id, date } = useParams();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [show, setShow] = useState(null);
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [discountPreview, setDiscountPreview] = useState(null);
  const [loadingPromo, setLoadingPromo] = useState(false);

  const { getToken, user } = useAppContext();

  const getShow = async () => {
    try {
      const { data } = await api.get(`/api/show/${id}`);
      if (data.success) {
        setShow({
          movie: data.movie,
          dateTime: data.dateTime,
          showPrice: data.showPrice,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getOccupiedSeats = async () => {
    if (!selectedTime?.showId) return;
    setIsLoadingSeats(true);
    try {
      const { data } = await api.get(
        `/api/bookings/${selectedTime.showId}/seats`
      );
      if (data.success) {
        setOccupiedSeats(data.occupiedSeats || []);
      }
    } catch (error) {
      console.error("Failed to load seats:", error);
    } finally {
      setIsLoadingSeats(false);
    }
  };

  // Tự loại bỏ ghế đã bị chiếm khi backend load xong
  useEffect(() => {
    setSelectedSeats((prev) =>
      prev.filter((seat) => !occupiedSeats.includes(seat))
    );
  }, [occupiedSeats]);

  const handleSeatClick = (seatId) => {
    if (isLoadingSeats) return toast("Please wait, loading seats...");
    if (!selectedTime) return toast("Please select time first");

    setSelectedSeats((prev) => {
      const already = prev.includes(seatId);
      if (!already && prev.length >= 5) {
        toast("You can only select up to 5 seats");
        return prev;
      }
      if (occupiedSeats.includes(seatId)) {
        toast("This seat is already booked");
        return prev;
      }
      return already ? prev.filter((s) => s !== seatId) : [...prev, seatId];
    });
  };

  const handleCheckPromo = async () => {
    if (!promoCode || !show) return toast.error("Enter a promo code first!");
    if (selectedSeats.length === 0) return toast.error("Select seats first!");
    setLoadingPromo(true);
    try {
      const price = Number(show?.showPrice || 0);
      const totalBeforeDiscount = price * selectedSeats.length;

      const { data } = await api.post("/api/stripe/check-promo", {
        code: promoCode,
        price: totalBeforeDiscount,
      });

      if (data.success) {
        const discountPercent = data.discountValue || 0;
        setDiscountPreview({
          discountValue: discountPercent,
          finalPrice: data.finalPrice ?? totalBeforeDiscount,
        });
        toast.success(`Promo applied: -${discountPercent}%`);
      } else toast.error(data.message);
    } catch (error) {
      toast.error("Invalid or inactive promo code");
    } finally {
      setLoadingPromo(false);
    }
  };

  const bookTickets = async () => {
    try {
      if (!user) return toast.error("Please login to proceed");
      if (!selectedTime || !selectedSeats.length)
        return toast.error("Please select a time and seat");

      setIsProcessing(true);
      const authApi = await authorizedApi(getToken);
      const { data } = await authApi.post("/api/bookings/create", {
        showId: selectedTime.showId,
        selectedSeats,
        promoCode,
      });

      if (data.success) {
        window.location.href = data.url;
      } else toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    getShow();
  }, []);

  useEffect(() => {
    const fetchSeats = async () => {
      if (!selectedTime?.showId) return;
      setIsLoadingSeats(true); // chặn click tạm thời
      try {
        const { data } = await api.get(
          `/api/bookings/${selectedTime.showId}/seats`
        );
        if (data.success) setOccupiedSeats(data.occupiedSeats || []);
      } catch (err) {
        console.error("Failed to load seats:", err);
        toast.error("Failed to load seat availability.");
      } finally {
        setIsLoadingSeats(false);
      }
    };
    fetchSeats();
  }, [selectedTime]);

  if (!show) return <Loading />;

  const price = Number(show?.showPrice || 0);
  const total = selectedSeats.length > 0 ? price * selectedSeats.length : 0;
  const finalTotal = discountPreview?.finalPrice ?? total;

  return (
    <div className="flex flex-col px-6 md:flex-row md:px-16 lg:px-40 py-30 md:pt-50">
      {/* Available Timings */}
      <div className="self-start px-4 py-6 border shadow-lg rounded-2xl w-60 bg-primary/10 border-primary/20 h-max md:sticky md:top-10">
        <p className="px-2 mb-3 text-lg font-semibold">Available Timings</p>
        <div className="space-y-2">
          {show.dateTime && show.dateTime[date] ? (
            show.dateTime[date].map((item) => (
              <div
                key={item.time}
                onClick={() => setSelectedTime(item)}
                className={`flex items-center gap-3 px-4 py-2 w-full rounded-2xl cursor-pointer transition-all duration-200 ${
                  selectedTime?.time === item.time
                    ? "bg-primary text-white shadow-md scale-[1.02]"
                    : "hover:bg-primary/10 text-gray-300"
                }`}
              >
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full transition-all ${
                    selectedTime?.time === item.time
                      ? "bg-white/25"
                      : "bg-primary/15"
                  }`}
                >
                  <ClockIcon
                    className={`w-4 h-4 ${
                      selectedTime?.time === item.time
                        ? "text-white"
                        : "text-primary"
                    }`}
                  />
                </div>
                <p className="text-sm font-medium">
                  {isoTimeFormat(item.time)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-center text-gray-400">
              No available timings.
            </p>
          )}
        </div>
      </div>

      {/* Seats Layout */}
      <div className="relative flex flex-col items-center flex-1 max-md:mt-16">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle top="0" right="0" />
        <h1 className="mb-4 text-2xl font-semibold">Select your seat</h1>
        <img src={assets.screenImage} alt="screen" />
        <p className="mb-6 text-sm text-gray-400">SCREEN</p>

        <div className="relative flex flex-col items-center mt-10 text-xs text-gray-300">
          {isLoadingSeats && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 rounded-2xl">
              <p className="text-sm text-white">Loading seats...</p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {seatRows.map((row) => (
              <div key={row} className="flex items-center gap-1">
                {Array.from({ length: 14 }, (_, i) => {
                  const seatId = `${row}${i + 1}`;
                  return (
                    <button
                      key={seatId}
                      onClick={() => handleSeatClick(seatId)}
                      disabled={
                        isLoadingSeats || occupiedSeats.includes(seatId)
                      }
                      className={`h-8 w-8 text-xs rounded border border-primary/60 transition-all
                        ${
                          selectedSeats.includes(seatId)
                            ? "bg-primary text-white scale-105"
                            : "hover:bg-primary/20"
                        }
                        ${
                          occupiedSeats.includes(seatId)
                            ? "opacity-40 cursor-not-allowed"
                            : "cursor-pointer"
                        }
                      `}
                    >
                      {seatId}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Discount & Total */}
        {selectedSeats.length > 0 && (
          <div className="mt-8 text-center text-white">
            <p className="mb-2 text-lg">
              Subtotal:{" "}
              <span className="font-semibold text-primary">
                ${total.toFixed(2)}
              </span>
            </p>

            <div className="flex items-center justify-center gap-2 mt-2">
              <input
                type="text"
                placeholder="Enter promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="p-2 text-sm border rounded-md bg-zinc-800 border-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleCheckPromo}
                disabled={loadingPromo}
                className="px-4 py-2 text-sm transition cursor-pointer rounded-xl bg-primary hover:bg-primary-dull"
              >
                {loadingPromo ? "Checking..." : "Apply"}
              </button>
            </div>

            {discountPreview && (
              <div className="mt-3 space-y-1">
                <p className="text-green-400">
                  ✅ Promo applied:{" "}
                  <strong>-{discountPreview.discountValue}%</strong>
                </p>
                <p className="text-lg">
                  Final Total:{" "}
                  <span className="font-semibold text-primary">
                    ${discountPreview.finalPrice.toFixed(2)}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={bookTickets}
          disabled={isProcessing}
          className="flex items-center gap-2 px-10 py-3 mt-20 text-sm font-medium transition rounded-full cursor-pointer bg-primary hover:bg-primary-dull active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isProcessing ? "Processing..." : "Proceed to Checkout"}
          {!isProcessing && (
            <ArrowRightIcon strokeWidth={3} className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default SeatLayout;
