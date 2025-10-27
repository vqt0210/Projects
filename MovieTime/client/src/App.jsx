import { Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { SignIn } from "@clerk/clerk-react";

import Home from "@/pages/user/Home";
import Movies from "@/pages/user/Movies";
import MovieDetails from "@/pages/user/MovieDetails";
import SeatLayout from "@/pages/userBookings/SeatLayout";
import Favorite from "@/pages/userBookings/Favorite";
import MyBookings from "@/pages/userBookings/MyBookings";
import TopRated from "@/pages/user/TopRated";
import Upcoming from "@/pages/user/Upcoming";
import ActorDetail from "@/pages/user/ActorDetail";

import Dashboard from "@/pages/admin/Dashboard";
import AddShows from "@/pages/admin/AddShows";
import ListShows from "@/pages/admin/ListShows";
import ListBookings from "@/pages/admin/ListBookings";
import AdminPanel from "@/pages/admin/AdminPanel";
import Layout from "@/pages/admin/Layout";

import Footer from "@/components/common/Footer";
import Navbar from "@/components/common/Navbar";
import Loading from "@/components/common/Loading";
import ScrollToTop from "@/components/common/ScrollToTop";

import { useAppContext } from "@/context/AppContext";
import Tickets from "./pages/userBookings/Tickets";
import Recommend from "./pages/user/Recommend";

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
        <Route path="/ticket/:id" element={<Tickets />} />
        <Route path="/recommend" element={<Recommend />} />
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
