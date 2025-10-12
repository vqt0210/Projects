import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assets, dummyDateTimeData, dummyShowsData } from "../assets/assets";
import Loading from "../components/Loading";
import { ArrowRightIcon, ClockIcon } from "lucide-react";
import isoTimeFormat from "../lib/isoTimeFormat";
import BlurCircle from "../components/BlurCircle";
import toast from "react-hot-toast";
import { useAppContext } from "../context/AppContext";
import api, { authorizedApi } from "../utils/api";

const SeatLayout = () => {
  const seatRows = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

  const { id, date } = useParams();
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [show, setShow] = useState(null);
  const [occupiedSeats, setOccupiedSeats] = useState([]);

  const navigate = useNavigate();

  const {getToken, user } = useAppContext();

  const getShow = async () => {
    try {
      const { data } = await api.get(`/api/show/${id}`);
      if (data.success) {
        setShow(data);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleSeatClick = (seatId) => {
    if (!selectedTime) {
      toast("Please select time first");
      return;
    }

    setSelectedSeats((prev) => {
      const already = prev.includes(seatId);

      if (!already && prev.length >= 5) {
        toast("You can only select up to 5 seats");
        return prev;
      }
      if (occupiedSeats.includes(seatId)) {
        return toast("This seat is already booked");
      }

      if (already) {
        return prev.filter((s) => s !== seatId);
      } else {
        return [...prev, seatId];
      }
    });
  };

  const renderSeats = (row, totalCols = 14) => (
    <div key={row} className="flex items-center gap-2">
      <div className="flex gap-1">
        {Array.from({ length: totalCols }, (_, i) => {
          const seatId = `${row}${i + 1}`;
          return (
            <button
              key={seatId}
              onClick={() => handleSeatClick(seatId)}
              className={`h-8 w-8 text-xs rounded border border-primary/60 cursor-pointer
              ${selectedSeats.includes(seatId) ? "bg-primary text-white" : ""}
              ${occupiedSeats.includes(seatId) && "opacity-50"}
            `}
            >
              {seatId}
            </button>
          );
        })}
      </div>
    </div>
  );

  const getOccupiedSeats = async () => {
    try {
      if (!selectedTime?.showId) return;
      const { data } = await api.get(
        `/api/bookings/${selectedTime.showId}/seats`
      );
      if (data.success) {
        setOccupiedSeats(data.occupiedSeats || []);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const bookTickets = async () => {
    try {
      if (!user) return toast.error("Please login to proceed");

      if (!selectedTime || !selectedSeats.length)
        return toast.error("Please select a time and seat");
      const authApi = await authorizedApi(getToken);
      const { data } = await authApi.post("/api/bookings/create", {
        showId: selectedTime.showId,
        selectedSeats,
      });
      if (data.success) {
        window.location.href = data.url;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    getShow();
  }, []);

  useEffect(() => {
    if (selectedTime) {
      getOccupiedSeats();
    }
  }, [selectedTime]);

  useEffect(() => {
    console.log("date:", date);
    console.log("show.dateTime:", show?.dateTime);
  }, [show, date]);

  return show ? (
    <div className="flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30 md:pt-50">
      {/*Available Timings */}
      <div className="w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max md:sticky md:top-30">
        <p className="text-lg font-semibold px-6">Available Timings</p>
        <div className="mt-5 space-y-1">
          {show.dateTime && show.dateTime[date] ? (
            show.dateTime[date].map((item) => (
              <div
                key={item.time}
                onClick={() => setSelectedTime(item)}
                className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition ${
                  selectedTime?.time === item.time
                    ? "bg-primary text-white"
                    : "hover:bg-primary/20"
                }`}
              >
                <ClockIcon className="w-4 h-4" />
                <p className="text-sm">{isoTimeFormat(item.time)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">
              No available timings for this date.
            </p>
          )}
        </div>
      </div>
      {/* Seats Layout */}
      <div className="relative flex-1 flex flex-col items-center max-md:mt-16">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle top="0" right="0" />
        <h1 className="text-2xl font-semibold mb-4">Select your seat</h1>
        <img src={assets.screenImage} alt="screen" />
        <p className="text-gray-400 text-sm mb-6">SCREEN</p>

        <div className="flex flex-col items-center mt-10 text-xs text-gray-300">
          {/* Layout ghế */}
          <div className="flex flex-col gap-2">
            {seatRows.map((row) => renderSeats(row))}
          </div>
        </div>

        <button
          onClick={bookTickets}
          className="flex items-center gap-1 mt-20 px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95"
        >
          Proceed to Checkout
          <ArrowRightIcon strokeWidth={3} className="w-4 h-4" />
        </button>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default SeatLayout;
