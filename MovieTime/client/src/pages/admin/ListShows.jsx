import { useEffect, useState } from "react";
import Loading from "../../components/common/Loading";
import Title from "../../components/admin/layout/Title";
import { dateFormat } from "../../lib/dateFormat";
import { useAppContext } from "../../context/AppContext";
import { authorizedApi } from "../../utils/api";

const ListShows = () => {
  const currency = import.meta.env.VITE_CURRENCY;

  const { getToken, user } = useAppContext();
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAllShows = async () => {
    try {
      const authApi = await authorizedApi(getToken);
      const { data } = await authApi.get("/api/admin/all-shows");
      setShows(data.shows || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      getAllShows();
    }
  }, [user]);
  return !loading ? (
    <>
      <Title text1="List" text2="Shows" />
      <div className="max-w-4xl mt-6 overflow-x-auto">
        <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">
          <thead>
            <tr className="bg-primary/20 text-left text-white">
              <th className="p-2 font-medium pl-5">Movie Name</th>
              <th className="p-2 font-medium pl-5">Show Time</th>
              <th className="p-2 font-medium pl-5">Total Bookings</th>
              <th className="p-2 font-medium pl-5">Earnings</th>
              <th className="p-2 font-medium pl-5">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm font-light">
            {shows.length > 0 ? (
              shows.map((show, index) => {
                const totalBookings = Object.keys(
                  show.occupiedSeats || {}
                ).length;
                const earnings = totalBookings * show.showPrice;
                const isPast = new Date(show.showDateTime) < new Date();
                return (
                  <tr
                    key={index}
                    className="border-b border-primary/10 bg-primary/5 even:bg-primary/10"
                  >
                    <td className="p-2 min-w-45 pl-5">
                      {show.movie?.title || "N/A"}
                    </td>
                    <td className="p-2">{dateFormat(show.showDateTime)}</td>
                    <td className="p-2">{totalBookings}</td>
                    <td className="p-2">
                      {currency} {earnings}
                    </td>
                    <td className="p-2">{isPast ? "Past" : "Upcoming"}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="text-center p-4 text-gray-500">
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

