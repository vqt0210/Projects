import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Loading from "@/components/common/Loading";
import { CalendarDays, Clock, CheckCircle, XCircle, Ticket } from "lucide-react";
import api from "@/utils/api";

export default function Tickets() {
  const { id } = useParams(); // bookingId
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const { data } = await api.get(`/api/ticket/${id}`);
        if (data.success) setTicket(data.ticket);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [id]);

  if (loading) return <Loading text="Loading your ticket..." />;
  if (!ticket) return <p className="mt-10 text-center text-gray-400">Ticket not found</p>;

  const { show, bookedSeats, amount, qrCode, status } = ticket;
  const { movie } = show || {};

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0C10] text-white px-6 py-20">
      <div className="relative bg-[#1F2833] p-8 rounded-2xl shadow-lg max-w-xl w-full border border-gray-700">
        {/* Movie Info */}
        <div className="flex flex-col items-center text-center">
          <img
            src={
              movie?.poster_path
                ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                : "/assets/fallBack.jpg"
            }
            alt={movie?.title}
            className="object-cover w-40 mb-4 rounded-lg shadow-md h-60"
          />
          <h1 className="mb-2 text-2xl font-bold text-primary">{movie?.title}</h1>
          <p className="mb-6 text-sm text-gray-300">🎟️ Booking Confirmation</p>
        </div>

        {/* Details */}
        <div className="space-y-3 text-gray-200">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <span>
              {new Date(show.showDateTime).toLocaleDateString("en-US", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <span>
              {new Date(show.showDateTime).toLocaleTimeString("en-US", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            <span>Seats: {bookedSeats.join(", ")}</span>
          </div>
          <div className="flex items-center gap-2">
            {status === "PAID" ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <span>
              Status:{" "}
              <strong
                className={
                  status === "PAID" ? "text-green-400" : "text-red-400"
                }
              >
                {status}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            💵 <span>Total: ${amount.toFixed(2)}</span>
          </div>
        </div>

        {/* QR Code */}
        {qrCode && (
          <div className="flex flex-col items-center mt-8">
            <img
              src={qrCode}
              alt="QR Code"
              className="border border-gray-600 rounded-lg shadow-md w-44 h-44"
            />
            <p className="mt-2 text-sm text-gray-400">
              Scan this QR at the cinema to check in
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
