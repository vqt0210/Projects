import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Loading from "@/components/common/Loading";
import api from "@/utils/api";

export default function Tickets() {
  const { id } = useParams();
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

  const { moviePoster, movieTitle, showDateTime, seats, amount, qrCode, status } = ticket;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b0c10] to-[#1f2833] text-white p-6">
      <div className="relative w-full max-w-md p-8 rounded-3xl shadow-xl border border-gray-700 bg-[#161b22]/80 backdrop-blur-lg">
        <div className="mb-6 text-center">
          <img
            src={moviePoster ? `https://image.tmdb.org/t/p/w500${moviePoster}` : "/assets/fallBack.jpg"}
            alt={movieTitle}
            className="object-cover w-48 h-64 mx-auto mb-4 rounded-lg shadow-md"
          />
          <h1 className="text-2xl font-bold text-primary">{movieTitle}</h1>
          <p className="mt-1 text-sm text-gray-400">🎟️ Booking Confirmation</p>
        </div>

        <div className="space-y-3 text-sm text-gray-300">
          <p className="flex justify-between"><span>🎬 Seats:</span><span>{seats.join(", ")}</span></p>
          <p className="flex justify-between"><span>📅 Date:</span>
            <span>{new Date(showDateTime).toLocaleDateString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })}</span></p>
          <p className="flex justify-between"><span>🕒 Time:</span>
            <span>{new Date(showDateTime).toLocaleTimeString("en-US", { timeZone: "Asia/Ho_Chi_Minh" })}</span></p>
          <p className="flex justify-between"><span>💵 Total:</span><span>${amount.toFixed(2)}</span></p>
          <p className="flex justify-between">
            <span>Status:</span>
            <span className={status === "PAID" ? "text-green-400 font-semibold" : "text-red-400"}>{status}</span>
          </p>
        </div>

        {qrCode && (
          <div className="mt-8 text-center">
            <img src={qrCode} alt="QR Code" className="w-48 h-48 mx-auto border border-gray-700 rounded-lg shadow-md" />
            <p className="mt-3 text-xs text-gray-400">Scan this QR code at the cinema to check in</p>
          </div>
        )}
      </div>
    </div>
  );
}
