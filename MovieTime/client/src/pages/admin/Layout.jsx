import AdminNavbar from "@/components/admin/layout/AdminNavbar";
import AdminSideBar from "@/components/admin/layout/AdminSideBar";
import { Outlet } from "react-router-dom";
import { useAppContext } from "@/context/AppContext";
import { useEffect } from "react";
import Loading from "@/components/common/Loading";


const Layout = () => {
  const { user, isAdmin, fetchIsAdmin } = useAppContext();

  useEffect(() => {
    if (user) {
      fetchIsAdmin();
    }
  }, [user]);

  return isAdmin ? (
    <>
      <AdminNavbar />
      <div className="flex">
        <AdminSideBar />
        <div className="flex-1 px-4 py-10 md:px-10 h-[calc(100vh-64px)] overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </>
  ) : (
    <Loading />
  );
};

export default Layout;
