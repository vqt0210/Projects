import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { authorizedApi } from "@/utils/api";

const Loading = () => {
  const { nextUrl } = useParams();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const navigate = useNavigate();
  const { getToken } = useAppContext();

  useEffect(() => {
    if (!nextUrl) return;

    // Không có bookingId (ví dụ các trang /loading/... khác) → giữ hành vi cũ
    if (!bookingId) {
      const timer = setTimeout(() => navigate("/" + nextUrl), 5000);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 8; // tối đa 8 giây

    const checkStatus = async () => {
      try {
        const api = await authorizedApi(getToken);
        const { data } = await api.get("/api/user/bookings");
        const booking = data.bookings?.find((b) => b._id === bookingId);

        if (booking && booking.status !== "PENDING_PAYMENT") {
          if (!cancelled) navigate("/" + nextUrl); // xong sớm → chuyển ngay
          return;
        }
      } catch (err) {
        console.error("Check booking status error:", err);
      }

      attempts++;
      if (attempts >= MAX_ATTEMPTS) {
        if (!cancelled) navigate("/" + nextUrl); // hết giờ chờ → vẫn chuyển, tránh treo mãi
        return;
      }
      if (!cancelled) setTimeout(checkStatus, 1000); // chưa xong → hỏi lại sau 1 giây
    };

    checkStatus();
    return () => {
      cancelled = true;
    };
  }, [nextUrl, bookingId]);

  return (
    <div className="flex justify-center items-center h-[80vh]">
      <div className="border-2 rounded-full animate-spin h-14 w-14 border-t-primary"></div>
    </div>
  );
};

export default Loading;
