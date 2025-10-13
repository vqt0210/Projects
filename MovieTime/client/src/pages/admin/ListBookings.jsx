import { useEffect, useState } from "react";
import Loading from "../../components/common/Loading";
import Title from "../../components/admin/layout/Title";
import { dateFormat } from "../../lib/dateFormat";
import { useAppContext } from "../../context/AppContext";
import { authorizedApi } from "../../utils/api";

const ListBookings = () => {
  const currency = import.meta.env.VITE_CURRENCY;
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getToken, user } = useAppContext();

  const getAllBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const authAxios = await authorizedApi(getToken);
      const { data } = await authAxios.get("/api/admin/all-bookings");
      // defensive: ensure array and remove nulls
      const list = Array.isArray(data?.bookings)
        ? data.bookings.filter(Boolean)
        : [];
      setBookings(list);
    } catch (err) {
      console.error("getAllBookings error", err);
      setError(err?.response?.data || err.message || "Failed to fetch");
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      getAllBookings();
    } else {
      // nếu muốn gọi ngay cả khi chưa có user thì bỏ điều kiện
      setIsLoading(false);
      setBookings([]);
    }
  }, [user]); // có thể thêm getToken nếu cần

  if (isLoading) return <Loading />;

  return (
    <>
      <Title text1="List" text2="Booking" />
      {error && (
        <div className="mt-4 p-3 bg-red-600/20 text-red-300 rounded">
          Error: {typeof error === "string" ? error : JSON.stringify(error)}
        </div>
      )}
      <div className="max-w-4xl mt-6 overflow-x-auto">
        <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">
          <thead>
            <tr className="bg-primary/20 text-left text-white">
              <th className="p-2 font-medium pl-5">User Name</th>
              <th className="p-2 font-medium">Movie Name</th>
              <th className="p-2 font-medium">Show Time</th>
              <th className="p-2 font-medium">Seats</th>
              <th className="p-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="text-sm font-light">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-300">
                  No bookings
                </td>
              </tr>
            ) : (
              bookings.map((item) => {
                // defensive getters
                const id =
                  item?._id ?? item?.id ?? Math.random().toString(36).slice(2);
                const userName =
                  item?.user?.name ?? item?.user?.email ?? "Unknown user";
                const movieTitle = item?.show?.movie?.title ?? "Unknown movie";
                const showTime = item?.show?.showDateTime
                  ? dateFormat(item.show.showDateTime)
                  : "N/A";
                const seats = item?.bookedSeats
                  ? // handle both array or object
                    Array.isArray(item.bookedSeats)
                    ? item.bookedSeats.join(", ")
                    : Object.values(item.bookedSeats).join(", ")
                  : "—";
                const amount = item?.amount ?? 0;

                return (
                  <tr
                    key={id}
                    className="border-b border-primary/20 bg-primary/5 even:bg-primary/10"
                  >
                    <td className="p-2 min-w-45 pl-5">{userName}</td>
                    <td className="p-2 min-w-45 pl-5">{movieTitle}</td>
                    <td className="p-2">{showTime}</td>
                    <td className="p-2">{seats}</td>
                    <td className="p-2">
                      {currency} {amount}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ListBookings;
