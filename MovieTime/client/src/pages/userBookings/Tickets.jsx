import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth, useUser, RedirectToSignIn } from "@clerk/clerk-react";
import Loading from "@/components/common/Loading";
import api from "@/utils/api";

export default function Tickets() {
  const { id } = useParams(); // bookingId
  const navigate = useNavigate();
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch ticket info
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        if (!isSignedIn) return; // Nếu chưa đăng nhập thì Clerk xử lý redirect

        const token = await getToken({ template: "default" });
        const { data } = await api.get(`/api/ticket/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (data.success) {
          // Kiểm tra xem user có đúng là người mua vé không
          if (data.ticket.userId !== user.id) {
            setError("You are not authorized to view this ticket.");
          } else {
            setTicket(data.ticket);
          }
        } else {
          setError(data.message || "Ticket not found.");
        }
      } catch (err) {
        console.error("[Ticket Fetch Error]", err);
        setError("Failed to load ticket.");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id, isSignedIn, getToken, user]);

  // Chưa đăng nhập thì chuyển sang Clerk Sign In
  if (!isSignedIn) return <RedirectToSignIn />;


  if (loading) return <Loading text="Loading your ticket..." />;

  // Error
  if (error)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center text-red-400">
        <p className="mb-4 font-semibold">{error}</p>
        <button
          onClick={() => navigate("/my-bookings")}
          className="px-4 py-2 text-white transition rounded-lg bg-primary hover:bg-primary-dull"
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b0c10] to-[#1f2833] text-white p-6">
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
