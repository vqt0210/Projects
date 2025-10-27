import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser, RedirectToSignIn } from "@clerk/clerk-react";
import Loading from "@/components/common/Loading";
import { authorizedApi } from "@/utils/api";
import { useAppContext } from "@/context/AppContext";

export default function Tickets() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAppContext();
  const { isLoaded, isSignedIn } = useUser();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  // Fetch ticket info
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const authAxios = await authorizedApi(getToken); // dùng token Clerk
        const { data } = await authAxios.get(`/api/ticket/${id}`);
        if (data.success) setTicket(data.ticket);
      } catch (err) {
        console.error("[Ticket Fetch Error]", err);
        if (err.response?.status === 403) setUnauthorized(true);
      } finally {
        setLoading(false);
      }
    };
    if (isLoaded && isSignedIn) fetchTicket();
  }, [id, isLoaded, isSignedIn]);

  // Chưa đăng nhập thì chuyển sang Clerk Sign In
  if (!isSignedIn) return <RedirectToSignIn />;

  if (loading) return <Loading text="Loading your ticket..." />;

  // Error
  if (unauthorized)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center text-red-400">
        <p className="mb-4 font-semibold">{error}</p>
        <button
          onClick={() => navigate("/my-bookings")}
          className="px-5 py-2 text-white transition rounded-full shadow-md cursor-pointer bg-primary hover:bg-primary-dull hover:shadow-lg"
        >
          Back to My Bookings
        </button>
      </div>
    );

  // Hiển thị vé
  const {
    moviePoster,
    movieTitle,
    showDateTime,
    seats,
    amount,
    qrCode,
    status,
  } = ticket;

  return (
    <div className="min-h-screen flex justify-center bg-gradient-to-br from-[#0b0c10] to-[#1f2833] text-white p-6 pt-32">
      <div className="absolute top-20 left-10 z-[9999]">
        <button
          onClick={() => navigate("/my-bookings")}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-[#1c1c1c]/70 hover:bg-[#2a2a2a]/80 text-white shadow-md transition-all duration-300 backdrop-blur-md cursor-pointer"
        >
          <span className="text-lg text-primary">←</span>
          Back to My Bookings
        </button>
      </div>
      <div className="relative w-full max-w-md p-8 rounded-3xl shadow-xl border border-gray-700 bg-[#161b22]/80 backdrop-blur-lg">
        {/* Header */}
        <div className="mb-6 text-center">
          <img
            src={
              moviePoster
                ? `https://image.tmdb.org/t/p/w500${moviePoster}`
                : "/assets/fallBack.jpg"
            }
            alt={movieTitle}
            className="object-cover w-48 h-64 mx-auto mb-4 rounded-lg shadow-md"
          />
          <h1 className="text-2xl font-bold text-primary">{movieTitle}</h1>
          <p className="mt-1 text-sm text-gray-400">🎟️ Booking Confirmation</p>
        </div>

        {/* Info */}
        <div className="space-y-3 text-sm text-gray-300">
          <p className="flex justify-between">
            <span>🎬 Seats:</span>
            <span>{Array.isArray(seats) ? seats.join(", ") : "N/A"}</span>
          </p>
          <p className="flex justify-between">
            <span>📅 Date:</span>
            <span>
              {new Date(showDateTime).toLocaleDateString("en-US", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </span>
          </p>
          <p className="flex justify-between">
            <span>🕒 Time:</span>
            <span>
              {new Date(showDateTime).toLocaleTimeString("en-US", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </span>
          </p>
          <p className="flex justify-between">
            <span>💵 Total:</span>
            <span>${amount?.toFixed(2)}</span>
          </p>
          <p className="flex justify-between">
            <span>Status:</span>
            <span
              className={
                status === "PAID"
                  ? "text-green-400 font-semibold"
                  : "text-red-400"
              }
            >
              {status}
            </span>
          </p>
        </div>

        {/* QR */}
        {qrCode && (
          <div className="mt-8 text-center">
            <img
              src={qrCode}
              alt="QR Code"
              className="w-48 h-48 mx-auto border border-gray-700 rounded-lg shadow-md"
            />
            <p className="mt-3 text-xs text-gray-400">
              Scan this QR code at the cinema to check in
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
