import {
  ChartLineIcon,
  CircleDollarSignIcon,
  PlayCircleIcon,
  UsersIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
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
} from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import EditShows from "./EditShows";

const AngledTick = ({ x, y, payload }) => {
  const label =
    payload.value.length > 16
      ? payload.value.slice(0, 16) + "…"
      : payload.value;
  return (
    <text
      x={x}
      y={y}
      dy={10}
      textAnchor="end"
      fill="#ddd"
      fontSize={11}
      fontFamily="Outfit, sans-serif"
      transform={`rotate(-35, ${x}, ${y})`}
    >
      {label}
    </text>
  );
};
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
    "#8B5CF6", // deep violet (new!)
  ];

  const dashboardCards = [
    { title: "Total Bookings", value: totalBookings || 0, icon: ChartLineIcon },
    {
      title: "Total Revenue",
      value: `${currency}${totalRevenue.toFixed(2) || 0}`,
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
  const ticketsByMovieData = dashboardData.ticketsByMovie.map((item) => ({
    movie: typeof item._id === "object" ? item._id.title : item._id,
    tickets: item.tickets,
  }));

  const revenueByMovieData = dashboardData.revenueByMovie.map((item) => ({
    movie: typeof item._id === "object" ? item._id.title : item._id,
    totalRevenue: item.totalRevenue,
  }));

  const reportFileName = `dashboard-report-${new Date()
    .toISOString()
    .slice(0, 10)}`;

  // ==== Export: Excel (.xlsx) ====
  // One sheet per data set so the admin can filter/sort in Excel/Sheets
  // without needing to touch the site itself.
  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ["Metric", "Value"],
      ["Total Bookings", totalBookings || 0],
      ["Total Revenue", totalRevenue?.toFixed(2) || 0],
      ["Active Shows", activeShows?.length || 0],
      ["Total Users", totalUser || 0],
      ["New Users (This Month)", dashboardData.newUsersThisMonth || 0],
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        ticketsByMovieData.map((d) => ({ Movie: d.movie, Tickets: d.tickets })),
      ),
      "Tickets by Movie",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        revenueByMovieData.map((d) => ({
          Movie: d.movie,
          [`Revenue (${currency})`]: d.totalRevenue,
        })),
      ),
      "Revenue by Movie",
    );

    if (dashboardData.revenueByMonth?.length) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          dashboardData.revenueByMonth.map((d) => ({
            Month: d.month,
            [`Revenue (${currency})`]: d.revenue,
          })),
        ),
        "Revenue by Month",
      );
    }

    if (dashboardData.revenueByGenre?.length) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          dashboardData.revenueByGenre.map((g) => ({
            Genre: typeof g._id === "object" ? g._id.name : g._id,
            [`Revenue (${currency})`]: g.totalRevenue,
          })),
        ),
        "Revenue by Genre",
      );
    }

    XLSX.writeFile(workbook, `${reportFileName}.xlsx`);
  };

  // ==== Export: PDF ====
  // A single printable report with a summary block plus a table per chart.
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const purple = [167, 139, 250];

    doc.setFontSize(16);
    doc.text("MovieTime — Admin Dashboard Report", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 24);
    doc.setTextColor(0);

    let cursorY = 32;

    autoTable(doc, {
      startY: cursorY,
      head: [["Metric", "Value"]],
      body: [
        ["Total Bookings", String(totalBookings || 0)],
        ["Total Revenue", `${currency}${totalRevenue?.toFixed(2) || 0}`],
        ["Active Shows", String(activeShows?.length || 0)],
        ["Total Users", String(totalUser || 0)],
        [
          "New Users (This Month)",
          String(dashboardData.newUsersThisMonth || 0),
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: purple },
    });
    cursorY = doc.lastAutoTable.finalY + 14;

    doc.setFontSize(12);
    doc.text("Tickets Sold per Movie", 14, cursorY - 4);
    autoTable(doc, {
      startY: cursorY,
      head: [["Movie", "Tickets"]],
      body: ticketsByMovieData.map((d) => [d.movie, d.tickets]),
      theme: "grid",
      headStyles: { fillColor: purple },
    });
    cursorY = doc.lastAutoTable.finalY + 14;

    doc.setFontSize(12);
    doc.text("Revenue by Movie", 14, cursorY - 4);
    autoTable(doc, {
      startY: cursorY,
      head: [["Movie", `Revenue (${currency})`]],
      body: revenueByMovieData.map((d) => [d.movie, d.totalRevenue]),
      theme: "grid",
      headStyles: { fillColor: purple },
    });

    doc.save(`${reportFileName}.pdf`);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Title text1="Admin" text2="Dashboard" />
        <div className="flex gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition border rounded-full cursor-pointer bg-primary/10 border-primary/20 hover:bg-primary/20"
          >
            <FileSpreadsheetIcon className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition border rounded-full cursor-pointer bg-primary/10 border-primary/20 hover:bg-primary/20"
          >
            <FileTextIcon className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* ==== Stat Cards ==== */}
      <div className="relative grid grid-cols-1 gap-5 mt-6 sm:grid-cols-2 lg:grid-cols-4">
        <BlurCircle top="-100px" left="0" />
        {dashboardCards.map((card, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-5 text-white transition-all duration-300 border shadow-md rounded-2xl bg-primary/10 border-primary/20 hover:bg-primary/20 hover:shadow-primary/30"
          >
            <div>
              <h1 className="text-sm opacity-90">{card.title}</h1>
              <p className="mt-1 text-2xl font-semibold text-primary">
                {card.value}
              </p>
            </div>
            <card.icon className="w-7 h-7 text-primary opacity-80" />
          </div>
        ))}
      </div>

      {/* ==== Charts Grid ==== */}
      <div className="grid grid-cols-1 gap-6 mt-10 lg:grid-cols-2">
        {/* Chart 1: Revenue by Month */}
        <div className="p-5 transition border shadow-md bg-primary/10 border-primary/20 rounded-2xl hover:shadow-primary/30">
          <p className="mb-4 text-lg font-semibold text-white">
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
              <YAxis
                stroke="#aaa"
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
        <div className="p-5 transition border shadow-md bg-primary/10 border-primary/20 rounded-2xl hover:shadow-primary/30">
          <p className="mb-4 text-lg font-semibold text-white">
            Tickets Sold per Movie{" "}
            <span className="text-sm text-primary/80">(Tickets)</span>
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ticketsByMovieData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
              />
              <XAxis
                dataKey="movie"
                stroke="#aaa"
                height={90}
                interval={0}
                tick={<AngledTick />}
              />
              <YAxis
                stroke="#aaa"
                allowDecimals={false}
                label={{
                  value: `Tickets`,
                  angle: -90,
                  position: "insideLeft",
                  fill: "#aaa",
                  fontSize: 12,
                }}
              />
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
        <div className="p-5 transition border shadow-md bg-primary/10 border-primary/20 rounded-2xl hover:shadow-primary/30">
          <p className="mb-4 text-lg font-semibold text-white">
            Revenue by Genre{" "}
            <span className="text-sm text-primary/80">({currency})</span>
          </p>

          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={dashboardData.revenueByGenre.map((g, i) => ({
                  name: typeof g._id === "object" ? g._id.name : g._id,
                  value: g.totalRevenue,
                  fill: COLORS[i % COLORS.length], // ← thêm dòng này
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
                    const { name, value, payload: dataPoint } = payload[0];
                    const fill = dataPoint?.fill || COLORS[0];

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

        <div className="p-5 transition border shadow-md bg-primary/10 border-primary/20 rounded-2xl hover:shadow-primary/30">
          <p className="mb-4 text-lg font-semibold text-white">
            Revenue by Movie{" "}
            <span className="text-sm text-primary/80">({currency})</span>
          </p>

          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={revenueByMovieData}
              margin={{ top: 20, right: 30, left: 10, bottom: 40 }}
              barCategoryGap="20%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
              />

              <XAxis
                dataKey="movie"
                stroke="#aaa"
                tickLine={false}
                interval={0}
                height={90}
                tick={<AngledTick />}
              />

              <YAxis
                stroke="#aaa"
                tick={{ fontSize: 12 }}
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

              <Bar
                dataKey="totalRevenue"
                fill="#A78BFA"
                radius={[6, 6, 0, 0]}
              />
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
