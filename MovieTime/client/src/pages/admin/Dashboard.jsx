import {
  ChartLineIcon,
  CircleDollarSignIcon,
  PlayCircleIcon,
  UsersIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import Loading from "@/components/common/Loading";
import Title from "@/components/admin/layout/Title";
import BlurCircle from "@/components/common/BlurCircle";
import { useAppContext } from "@/context/AppContext";
import { authorizedApi } from "@/utils/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  LabelList,
} from "recharts";
import EditShows from "./EditShows";

const Dashboard = () => {
  const { getToken, user } = useAppContext();
  const currency = import.meta.env.VITE_CURRENCY;

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const authApi = await authorizedApi(getToken);
      const { data } = await authApi.get("/api/admin/dashboard");
      if (data.success) {
        setDashboardData(data.dashboardData);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  if (loading) return <Loading />;
  if (!dashboardData) return <p>No dashboard data available</p>;

  const { totalBookings, totalRevenue, activeShows, totalUser } = dashboardData;

  const COLORS = [
    "#A78BFA", // light violet
    "#60A5FA", // sky blue
    "#34D399", // emerald
    "#FBBF24", // amber
    "#F87171", // red
    "#38BDF8", // cyan
  ];

  const dashboardCards = [
    { title: "Total Bookings", value: totalBookings || 0, icon: ChartLineIcon },
    {
      title: "Total Revenue",
      value: `${currency}${totalRevenue || 0}`,
      icon: CircleDollarSignIcon,
    },
    {
      title: "Active Shows",
      value: activeShows?.length || 0,
      icon: PlayCircleIcon,
    },
    { title: "Total Users", value: totalUser || 0, icon: UsersIcon },
    {
      title: "New Users (This Month)",
      value: dashboardData.newUsersThisMonth || 0,
      icon: UsersIcon,
    },
  ];

  return (
    <>
      <Title text1="Admin" text2="Dashboard" />

      {/* ==== Stat Cards ==== */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
        <BlurCircle top="-100px" left="0" />
        {dashboardCards.map((card, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-5 rounded-2xl shadow-md bg-primary/10 border border-primary/20 text-white hover:bg-primary/20 hover:shadow-primary/30 transition-all duration-300"
          >
            <div>
              <h1 className="text-sm opacity-90">{card.title}</h1>
              <p className="text-2xl font-semibold mt-1 text-primary">
                {card.value}
              </p>
            </div>
            <card.icon className="w-7 h-7 text-primary opacity-80" />
          </div>
        ))}
      </div>

      {/* ==== Charts Grid ==== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
        {/* Chart 1: Revenue by Month */}
        <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl shadow-md hover:shadow-primary/30 transition">
          <p className="text-lg font-semibold mb-4 text-white">
            Revenue by Month{" "}
            <span className="text-sm text-primary/80">({currency})</span>
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardData.revenueByMonth}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
              />
              <XAxis dataKey="month" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Tooltip
                formatter={(v) => [
                  `${v.toLocaleString()} ${currency}`,
                  "Revenue",
                ]}
                contentStyle={{
                  backgroundColor: "rgba(30,41,59,0.95)",
                  border: "none",
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#A78BFA"
                strokeWidth={2}
                dot={{ r: 4, stroke: "#fff", fill: "#A78BFA" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Tickets Sold per Movie */}
        <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl shadow-md hover:shadow-primary/30 transition">
          <p className="text-lg font-semibold mb-4 text-white">
            Tickets Sold per Movie{" "}
            <span className="text-sm text-primary/80">(Tickets)</span>
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.ticketsByMovie}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
              />
              <XAxis dataKey="_id" stroke="#aaa" tick={{ fontSize: 12 }} />
              <YAxis stroke="#aaa" />
              <Tooltip
                formatter={(v) => [`${v.toLocaleString()} tickets`, "Tickets"]}
                contentStyle={{
                  backgroundColor: "rgba(30,41,59,0.95)",
                  border: "none",
                }}
              />
              <Bar dataKey="tickets" fill="#A78BFA" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: Revenue by Genre */}
        <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl shadow-md hover:shadow-primary/30 transition">
          <p className="text-lg font-semibold mb-4 text-white">
            Revenue by Genre{" "}
            <span className="text-sm text-primary/80">({currency})</span>
          </p>

          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={dashboardData.revenueByGenre.map((g) => ({
                  name: typeof g._id === "object" ? g._id.name : g._id,
                  value: g.totalRevenue,
                }))}
                dataKey="value"
                nameKey="name"
                outerRadius={130}
                label
              >
                {dashboardData.revenueByGenre.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const { name, value, fill } = payload[0];
                    return (
                      <div
                        style={{
                          backgroundColor: "rgba(30,41,59,0.95)",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          borderLeft: `4px solid ${fill}`,
                          color: "#fff",
                          boxShadow: `0 0 10px ${fill}55`,
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            color: fill,
                            textTransform: "capitalize",
                          }}
                        >
                          {name}
                        </p>
                        <p style={{ margin: "4px 0 0", fontSize: 13 }}>
                          {`${value.toLocaleString()} ${currency}`}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 4: Revenue by Movie */}
        <div className="bg-primary/10 border border-primary/20 p-5 rounded-2xl shadow-md hover:shadow-primary/30 transition">
          <p className="text-lg font-semibold mb-4 text-white">
            Revenue by Movie{" "}
            <span className="text-sm text-primary/80">({currency})</span>
          </p>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart
              data={dashboardData.revenueByMovie}
              margin={{ top: 20, right: 30, left: 10, bottom: 80 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
              />
              <XAxis
                dataKey="_id"
                stroke="#ccc"
                tick={{ fontSize: 12, fill: "#ddd" }}
                interval={0}
                angle={-25}
                dy={20}
                height={60}
              />
              <YAxis
                stroke="#ccc"
                tick={{ fontSize: 12, fill: "#ddd" }}
                label={{
                  value: `Revenue (${currency})`,
                  angle: -90,
                  position: "insideLeft",
                  fill: "#aaa",
                  fontSize: 12,
                }}
              />
              <Tooltip
                formatter={(v) => [
                  `${v.toLocaleString()} ${currency}`,
                  "Revenue",
                ]}
                contentStyle={{
                  backgroundColor: "rgba(30,41,59,0.95)",
                  border: "none",
                  borderRadius: "8px",
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: "10px" }}
              />
              <defs>
                <linearGradient id="movieGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <Bar
                dataKey="totalRevenue"
                fill="url(#movieGradient)"
                radius={[8, 8, 0, 0]}
                barSize={60}
              >
                <LabelList
                  dataKey="totalRevenue"
                  position="top"
                  formatter={(v) => `${currency}${v}`}
                  style={{ fill: "#fff", fontSize: 11 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ==== Active Shows ==== */}
      <p className="mt-12 text-xl font-semibold text-white">Active Shows</p>
      <EditShows shows={activeShows} refreshDashboard={fetchDashboardData} />
    </>
  );
};

export default Dashboard;
