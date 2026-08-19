import { useEffect, useState } from "react";
import Loading from "@/components/common/Loading";
import BlurCircle from "@/components/common/BlurCircle";
import timeFormat from "@/lib/timeFormat";
import { dateFormat } from "@/lib/dateFormat";
import { useAppContext } from "@/context/AppContext";
import { useClerk, useUser } from "@clerk/clerk-react";
import { authorizedApi } from "@/utils/api";
import { io } from "socket.io-client";
import { Toaster, toast } from "sonner";
import { useNavigate } from "react-router-dom";

const MyBookings = () => {
  const navigate = useNavigate();
  const currency = import.meta.env.VITE_CURRENCY;
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { openSignIn } = useClerk();
  const { isLoaded, isSignedIn } = useUser();
  const { getToken, user, image_base_url } = useAppContext();

  const getMyBookings = async () => {
    try {
      const authAxios = await authorizedApi(getToken);
      const { data } = await authAxios.get("/api/user/bookings");
      if (data.success) setBookings(data.bookings);
    } catch (error) {
      console.log(error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (user) getMyBookings();
  }, [user]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_BASE_URL || "http://localhost:10000";
    const socket = io(socketUrl, {
      withCredentials: true,
      secure: socketUrl.startsWith("https"),
      reconnectionAttempts: 5,
    });

    socket.on("paymentUpdate", ({ bookingId }) => {
      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId ? { ...b, isPaid: true, status: "PAID" } : b,
        ),
      );
      toast.success("Payment Successful!", {
        description: "Your booking has been confirmed.",
        duration: 4000,
      });
      setTimeout(() => getMyBookings(), 2000);
    });

    return () => socket.disconnect();
  }, []);
  useEffect(() => {
    const hasPending = bookings.some(
      (b) => b.status !== "CANCELLED" && !b.isPaid,
    );
    if (!hasPending) return;

    const intervalId = setInterval(() => {
      getMyBookings();
    }, 6000);

    return () => clearInterval(intervalId);
  }, [bookings]);

  if (isLoading || !isLoaded) return <Loading />;
  if (!isSignedIn)
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center">
        <h2 className="mb-4 text-xl font-semibold">
          You must{" "}
          <button
            onClick={openSignIn}
            className="font-semibold text-primary hover:underline hover:text-primary/80"
          >
            login
          </button>{" "}
          to continue
        </h2>
      </div>
    );

  const activeBookings = bookings.filter(
    (b) => b.status !== "CANCELLED" && b.show !== null,
  );

  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]">
        <BlurCircle top="100px" left="100px" />
        <BlurCircle bottom="0px" left="600px" />
        <h1 className="mb-4 text-lg font-semibold">My Bookings</h1>

        {activeBookings.length === 0 ? (
          <p className="mt-10 text-gray-400">You have no active bookings.</p>
        ) : (
          activeBookings.map((item) => {
            const amount = Number(item.amount) || 0;
            const isPaid = !!item.isPaid;
            const movie = item.show?.movie;
            const poster = movie?.poster_path;
            const title = movie?.title || "Unknown Movie";
            const runtime = movie?.runtime;
            const showTime = item.show?.showDateTime;
            const seats = Array.isArray(item.bookedSeats)
              ? item.bookedSeats
              : [];

            return (
              <div
                key={item._id}
                className="flex flex-col justify-between max-w-3xl p-2 mt-4 border rounded-lg md:flex-row bg-primary/8 border-primary/20"
              >
                <div className="flex flex-col md:flex-row">
                  {poster ? (
                    <img
                      src={image_base_url + poster}
                      alt={title}
                      className="object-cover object-bottom h-auto rounded md:max-w-45 aspect-video"
                    />
                  ) : (
                    <div className="object-cover object-bottom h-auto bg-gray-300 rounded md:max-w-45 aspect-video" />
                  )}
                  <div className="flex flex-col p-4">
                    <p className="text-lg font-semibold">{title}</p>
                    <p className="text-sm text-gray-400">
                      {runtime != null ? timeFormat(runtime) : "N/A"}
                    </p>
                    <p className="mt-auto text-sm text-gray-400">
                      {showTime ? dateFormat(showTime) : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-between p-4 mb-2 md:items-end md:text-right">
                  <div className="flex items-center gap-4 mb-3">
                    <p className="text-2xl font-semibold leading-none">
                      {currency}
                      {amount.toFixed(2)}
                    </p>

                    <span
                      className={`min-w-[100px] px-4 py-1.5 text-sm rounded-full font-medium text-center ${
                        item.status === "CANCELLED"
                          ? "bg-red-500/20 text-red-300"
                          : isPaid
                            ? "bg-green-500/20 text-green-300"
                            : "bg-yellow-500/20 text-yellow-300"
                      }`}
                    >
                      {item.status === "CANCELLED"
                        ? "Cancelled"
                        : isPaid
                          ? "Paid"
                          : "Pending"}
                    </span>
                  </div>

                  <div className="text-sm text-gray-300">
                    <p>
                      <span className="text-gray-400 ">Seats:</span>{" "}
                      {seats.join(", ")}
                    </p>
                  </div>

                  {/* View Ticket */}
                  {isPaid && (
                    <button
                      onClick={() => navigate(`/ticket/${item._id}`)}
                      className="px-6 py-2 mt-5 text-white transition-all duration-300 transform shadow-md cursor-pointer rounded-2xl bg-primary hover:bg-primary-dull hover:scale-105 hover:shadow-lg"
                    >
                      View Ticket
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
};

export default MyBookings;
