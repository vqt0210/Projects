import { Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Movies from "./pages/Movies";
import MovieDetails from "./pages/MovieDetails";
import SeatLayout from "./pages/SeatLayout";
import Favorite from "./pages/Favorite";
import { Toaster } from "react-hot-toast";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import MyBookings from "./pages/MyBookings";
import Layout from "./pages/admin/Layout";
import Dashboard from "./pages/admin/Dashboard";
import AddShows from "./pages/admin/AddShows";
import ListShows from "./pages/admin/ListShows";
import ListBookings from "./pages/admin/ListBookings";
import { useAppContext } from "./context/AppContext";
import { SignIn } from "@clerk/clerk-react";
import Loading from "./components/Loading";
import ScrollToTop from "./components/ScrollToTop";
import TopRated from './pages/TopRated';
import Upcoming from './pages/Upcoming';
import ActorDetail from "./pages/ActorDetail";
import AdminPanel from "./pages/admin/AdminPanel";

const App = () => {
  const isAdminRoute = useLocation().pathname.startsWith("/admin"); //Hàm dùng để biết mình đang ở trang nào

  const { user } = useAppContext();
  return (
    <>
      <Toaster />
      {!isAdminRoute && <Navbar />}
      <ScrollToTop threshold={300} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/movies/:id" element={<MovieDetails />} />
        <Route path="/movies/:id/:date" element={<SeatLayout />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/loading/:nextUrl" element={<Loading />} />
        <Route path="/favorite" element={<Favorite />} />
        <Route path="/top-rated" element={<TopRated />} />
        <Route path="/upcoming" element={<Upcoming />} />
        <Route path="/actors/:id" element={<ActorDetail />} />
        <Route
          path="/admin/*"
          element={
            user ? (
              <Layout />
            ) : (
              <div className="flex items-center justify-center min-h-screen">
                <SignIn fallbackRedirectUrl={"/admin"} />
              </div>
            )
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="add-shows" element={<AddShows />} />
          <Route path="list-shows" element={<ListShows />} />
          <Route path="list-bookings" element={<ListBookings />} />
          <Route path="users" element={<AdminPanel />} />
        </Route>
      </Routes>
      {!isAdminRoute && <Footer />}
    </>
  );
};

export default App;
