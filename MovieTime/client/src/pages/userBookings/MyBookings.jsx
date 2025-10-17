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

const MyBookings = () => {
  const currency = import.meta.env.VITE_CURRENCY;
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { openSignIn } = useClerk();
  const { isLoaded, isSignedIn } = useUser(); // Clerk hook
  const { getToken, user, image_base_url } = useAppContext();

  // Chỉ gọi AppContext sau khi user đã đăng nhập

  const getMyBookings = async () => {
    try {
      const authAxios = await authorizedApi(getToken);
      const { data } = await authAxios.get("/api/user/bookings");

      if (data.success) {
        setBookings(data.bookings);
      }
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

  // Realtime cập nhật bằng Socket.IO
  useEffect(() => {
    // kết nối socket tới backend
    const socketUrl = import.meta.env.VITE_BASE_URL || "http://localhost:10000";
    const socket = io(socketUrl, {
      transports: ["websocket"],
      withCredentials: true,
      secure: socketUrl.startsWith("https"),
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("Connected to socket:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from socket");
    });

    // Khi backend emit sự kiện paymentUpdate
    socket.on("paymentUpdate", ({ bookingId }) => { 
      console.log("Payment updated:", bookingId);
      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId ? { ...b, isPaid: true, status: "PAID" } : b
        )
      );
      toast.success("🎉 Payment Successful!", {
        description: "Your booking has been confirmed. Enjoy the show!",
        duration: 4000,
      });
    });

    // cleanup khi unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  if (isLoading) return <Loading />;

  // Nếu Clerk chưa load xong
  if (!isLoaded) return <Loading />;

  // Nếu chưa đăng nhập
  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center">
        <h2 className="mb-4 text-xl font-semibold">
          You must{" "}
          <button
            onClick={openSignIn}
            className="font-semibold transition cursor-pointer text-primary hover:underline hover:text-primary/80"
          >
            login
          </button>{" "}
          to continue
        </h2>
      </div>
    );
  }

 return (
    <>
      <Toaster position="top-right" richColors closeButton />
      {!isSignedIn ? (
        <div className="flex flex-col items-center justify-center h-[80vh] text-center">
          <h2 className="mb-4 text-xl font-semibold">
            You must{" "}
            <button
              onClick={openSignIn}
              className="font-semibold transition cursor-pointer text-primary hover:underline hover:text-primary/80"
            >
              login
            </button>{" "}
            to continue
          </h2>
        </div>
      ) : isLoading ? (
        <Loading />
      ) : (
        <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]">
          <BlurCircle top="100px" left="100px" />
          <div>
            <BlurCircle bottom="0px" left="600px" />
          </div>
          <h1 className="mb-4 text-lg font-semibold">My Bookings</h1>

          {bookings.length === 0 ? (
            <p className="mt-10 text-gray-400">You have no bookings yet.</p>
          ) : (
            bookings.map((item, index) => {
              const amount = Number(item?.amount) || 0;
              const isPaid = !!item?.isPaid;
              const paymentUrl = item?.paymentLink ?? item?.payment ?? "";
              const canPay = amount > 0 && !isPaid && paymentUrl;
              const movie = item?.show?.movie;
              const poster = movie?.poster_path;
              const title = movie?.title || "Unknown Movie";
              const runtime = movie?.runtime;
              const showTime = item?.show?.showDateTime;
              const seats = Array.isArray(item?.bookedSeats)
                ? item.bookedSeats
                : [];

              return (
                <div
                  key={item?._id || index}
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
                        {amount}
                      </p>

                      {canPay ? (
                        <a
                          href={paymentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center h-9 min-w-[110px] px-5 rounded-full bg-primary text-sm font-medium leading-none text-center whitespace-nowrap"
                        >
                          Pay Now
                        </a>
                      ) : (
                        <span className="min-w-[100px] px-4 py-1.5 text-sm rounded-full font-medium bg-green-500/20 text-green-300 text-center">
                          {amount === 0
                            ? "Free Booking"
                            : isPaid
                            ? "Paid"
                            : "Pending"}
                        </span>
                      )}
                    </div>

                    <div className="text-sm">
                      <p>
                        <span className="text-gray-400">Total Tickets: </span>
                        {seats.length}
                      </p>
                      <p>
                        <span className="text-gray-400">Seat Number: </span>
                        {seats.join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
};

export default MyBookings;
