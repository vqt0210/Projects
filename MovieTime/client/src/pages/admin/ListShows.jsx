import { useEffect, useState } from "react";
import Loading from "../../components/common/Loading";
import Title from "../../components/admin/layout/Title";
import { useAppContext } from "../../context/AppContext";
import { authorizedApi } from "../../utils/api";

const ListShows = () => {
  const currency = import.meta.env.VITE_CURRENCY;
  const { getToken, user } = useAppContext();
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  // 👉 Hàm định dạng ngày giờ theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)
  const formatDateVN = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      weekday: "short",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getAllShows = async () => {
    try {
      const authApi = await authorizedApi(getToken);
      const { data } = await authApi.get("/api/admin/all-shows");
      setShows(data.shows || []);
    } catch (error) {
      console.error("Failed to load shows:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) getAllShows();
  }, [user]);

  return !loading ? (
    <>
      <Title text1="List" text2="Shows" />
      <div className="max-w-4xl mt-6 overflow-x-auto">
        <table className="w-full overflow-hidden border-collapse rounded-md text-nowrap">
          <thead>
            <tr className="text-left text-white bg-primary/20">
              <th className="p-2 pl-5 font-medium">Movie Name</th>
              <th className="p-2 font-medium">Show Time</th>
              <th className="p-2 font-medium">Total Bookings</th>
              <th className="p-2 font-medium">Earnings</th>
              <th className="p-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm font-light">
            {shows.length > 0 ? (
              shows.map((show, index) => {
                const totalBookings = Object.keys(show.occupiedSeats || {}).length;
                const earnings = totalBookings * show.showPrice;
                const isPast = new Date(show.showDateTime) < new Date();

                return (
                  <tr
                    key={index}
                    className="border-b border-primary/10 bg-primary/5 even:bg-primary/10"
                  >
                    <td className="p-2 pl-5">{show.movie?.title || "N/A"}</td>
                    <td className="p-2">{formatDateVN(show.showDateTime)}</td>
                    <td className="p-2 text-center">{totalBookings}</td>
                    <td className="p-2">
                      {currency} {earnings.toLocaleString()}
                    </td>
                    <td
                      className={`p-2 font-medium ${
                        isPast ? "text-gray-400" : "text-green-400"
                      }`}
                    >
                      {isPast ? "Past" : "Upcoming"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No shows available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  ) : (
    <Loading />
  );
};

export default ListShows;
