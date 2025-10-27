import { useState, useEffect } from "react";
import { authorizedApi } from "../../utils/api";
import { Shield, ShieldOff, Star, Trash2 } from "lucide-react";
import Title from "@/components/admin/layout/Title";
import BlurCircle from "@/components/common/BlurCircle";
import Loading from "@/components/common/Loading";
import { toast } from "react-hot-toast";
import { useAppContext } from "@/context/AppContext";
import { CopyTokenButton } from "@/components/admin/utils/CopyToken";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const AdminPanel = () => {
  const {
    getToken,
    user: currentUser,
    isAdmin,
    isCheckingAdmin,
    navigate,
  } = useAppContext();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingUserId, setLoadingUserId] = useState(null);
  const [currentUserWithRole, setCurrentUserWithRole] = useState(null);

  useEffect(() => {
    if (!isCheckingAdmin && !isAdmin) {
      toast.dismiss();
      toast.error("You are not allowed to access admin dashboard");
      navigate("/");
    }
  }, [isCheckingAdmin, isAdmin, navigate]);

  // Fetch danh sách user
  const fetchUsers = async () => {
    try {
      const authApi = await authorizedApi(getToken);
      const { data } = await authApi.get("/api/admin/users");
      setUsers(data.users || []);
    } catch {
      setError("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && isAdmin) fetchUsers();
  }, [currentUser, getToken, isAdmin]);

  // Fetch thông tin current user (để xác định vai trò)
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const authApi = await authorizedApi(getToken);
        const { data } = await authApi.get("/api/me");
        setCurrentUserWithRole(data);
      } catch (err) {
        console.error("Error fetching current user:", err);
      }
    };
    if (isAdmin) fetchCurrentUser();
  }, [getToken, isAdmin]);

  const handleRoleChange = async (userId, newRole) => {
    setLoadingUserId(userId);
    try {
      const authApi = await authorizedApi(getToken);
      await authApi.patch(`/api/admin/update-role/${userId}`, {
        role: newRole,
      });
      setUsers((prev) =>
        prev.map((u) =>
          (u._id || u.id) === userId ? { ...u, role: newRole } : u
        )
      );
      toast.success(
        `User ${newRole === "admin" ? "promoted" : "revoked"} successfully`
      );
    } catch {
      toast.error("Failed to update role");
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!userId) return toast.error("Invalid user ID");
    if (userId === currentUserWithRole?.id) {
      return toast.error("You cannot delete your own account");
    }

    const MySwal = withReactContent(Swal);
    const result = await MySwal.fire({
      title: "Are you sure?",
      text: "This user will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#f84565",
      cancelButtonColor: "#6b7280",
      background: "#1e1e1e",
      color: "#fff",
    });

    if (!result.isConfirmed) return;

    setPageLoading(true);
    try {
      const authApi = await authorizedApi(getToken);
      const { data } = await authApi.delete(`/api/admin/delete-user/${userId}`);
      if (data.success) {
        toast.success("User deleted successfully");
        setUsers((prev) => prev.filter((u) => (u._id || u.id) !== userId));
      } else toast.error(data.message || "Failed to delete user");
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error("You cannot delete this user (permission denied)");
      } else {
        toast.error("Error deleting user");
      }
    } finally {
      setPageLoading(false);
    }
  };

  if (isCheckingAdmin) {
    return <Loading text="Checking permission..." />;
  }

  if (loading) return <Loading text="Loading users..." />;

  const currentUserRole = currentUserWithRole?.role;
  const isSuperAdmin = currentUserRole === "super-admin";
  const canManageRoles = isSuperAdmin || currentUserRole === "admin";

  return (
    <>
      {pageLoading && <Loading text="Updating role..." />}
      <Title text1="Admin" text2="User Management" />

      {/*Admin Access Card (DEV only)*/}
      {import.meta.env.MODE === "development" && (
        <div className="p-4 mb-6 text-white border rounded-lg bg-primary/10 border-primary/20">
          <h2 className="mb-2 text-lg font-semibold">Admin Access</h2>
          <p className="mb-3 text-sm opacity-80">
            Use this token for <strong>development</strong> and API testing
            only.
          </p>
          <CopyTokenButton />
        </div>
      )}

      {/* ==== Users List ==== */}
      <div className="relative flex flex-col p-6 mt-6 border rounded-lg bg-primary/10 border-primary/20">
        <BlurCircle top="-100px" left="0" />
        {error ? (
          <p className="py-6 text-center text-red-500">{error}</p>
        ) : users.length === 0 ? (
          <p className="py-6 text-center text-gray-500">No users found.</p>
        ) : (
          <div className="space-y-4">
            {users.map((user) => {
              const isCurrentUser =
                (user._id || user.id) === currentUserWithRole?.id;
              return (
                <div
                  key={user._id || user.email || Math.random()}
                  className="flex flex-col justify-between p-4 transition rounded-lg shadow-sm md:flex-row md:items-center bg-white/80 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={user.image || "/assets/profile_pic.png"}
                      alt={user.name}
                      className="object-cover w-12 h-12 border rounded-full"
                    />
                    <div>
                      <p className="font-semibold text-gray-800">
                        {user.name || "Unnamed"}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>

                  {/* Role badges + actions */}
                  <div className="flex items-center gap-3 mt-3 md:mt-0">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        user.role === "super-admin"
                          ? "bg-yellow-100 text-yellow-800"
                          : user.role === "admin"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      } flex items-center gap-1`}
                    >
                      {user.role === "super-admin" && <Star size={12} />}
                      {user.role}
                    </span>

                    {canManageRoles && (
                      <button
                        disabled={
                          isCurrentUser ||
                          user.role === "super-admin" ||
                          (currentUserRole !== "super-admin" &&
                            user.role === "admin")
                        }
                        onClick={() =>
                          handleRoleChange(
                            user._id || user.id,
                            user.role === "admin" ? "user" : "admin"
                          )
                        }
                        className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                          user.role === "admin"
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-blue-500 hover:bg-blue-600"
                        } text-white ${
                          isCurrentUser ||
                          user.role === "super-admin" ||
                          (currentUserRole !== "super-admin" &&
                            user.role === "admin")
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer"
                        }`}
                      >
                        {loadingUserId === user._id ? (
                          <span className="animate-pulse">Processing...</span>
                        ) : user.role === "admin" ? (
                          <>
                            <ShieldOff size={16} />
                            Revoke
                          </>
                        ) : (
                          <>
                            <Shield size={16} />
                            Promote
                          </>
                        )}
                      </button>
                    )}

                    <button
                      disabled={
                        isCurrentUser || // không tự xóa mình
                        user.role === "super-admin" || // không xóa superadmin
                        (currentUserRole === "admin" && user.role !== "user") // admin chỉ được xóa user thường
                      }
                      onClick={() => handleDeleteUser(user._id || user.id)}
                      className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg text-white transition-all duration-200
                      ${
                        isCurrentUser ||
                        user.role === "super-admin" ||
                        (currentUserRole === "admin" && user.role !== "user")
                          ? "bg-gray-500 opacity-50 cursor-not-allowed"
                          : "bg-red-500 hover:bg-red-600 cursor-pointer"
                      }
                    `}
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default AdminPanel;
