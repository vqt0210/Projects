import { useState, useEffect } from "react";
import { authorizedApi } from "../../utils/api";
import { Shield, ShieldOff, Star, Trash2 } from "lucide-react";
import Title from "../../components/admin/Title";
import BlurCircle from "../../components/BlurCircle";
import Loading from "../../components/Loading";
import { toast } from "react-hot-toast";
import { useAppContext } from "../../context/AppContext";
import { CopyTokenButton } from "../../components/admin/CopyToken";

const AdminPanel = () => {
  const { getToken, user: currentUser, isAdmin, isCheckingAdmin, navigate } =
    useAppContext();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingUserId, setLoadingUserId] = useState(null);
  const [currentUserWithRole, setCurrentUserWithRole] = useState(null);

  // Chờ Clerk & kiểm tra quyền admin xong
  if (isCheckingAdmin) return <Loading text="Checking permission..." />;

  // Nếu không phải admin → quay về trang chủ (tránh 403)
  useEffect(() => {
    if (!isCheckingAdmin && !isAdmin) {
      toast.dismiss();
      toast.error("You are not allowed to access admin dashboard");
      navigate("/");
    }
  }, [isCheckingAdmin, isAdmin, navigate]);

  // Fetch danh sách user (chỉ khi đã xác định là admin)
  const fetchUsers = async () => {
    try {
      const authApi = await authorizedApi(getToken);
      const { data } = await authApi.get("/api/admin/users");
      setUsers(data.users || []);
    } catch (err) {
      setError("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && isAdmin) {
      fetchUsers();
    }
  }, [currentUser, getToken, isAdmin]);

  // Fetch thông tin current user (để biết role)
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

  // Update role
  const handleRoleChange = async (userId, newRole) => {
    setLoadingUserId(userId);
    try {
      const authApi = await authorizedApi(getToken);
      await authApi.patch(`/api/admin/update-role/${userId}`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
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

  // Delete user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    setPageLoading(true);
    try {
      const authApi = await authorizedApi(getToken);
      const { data } = await authApi.delete(`/api/admin/delete-user/${userId}`);
      if (data.success) {
        toast.success("User deleted successfully");
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        toast.error(data.message || "Failed to delete user");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting user");
    } finally {
      setPageLoading(false);
    }
  };

  if (loading) return <Loading text="Loading users..." />;

  const currentUserRole = currentUserWithRole?.role;
  const isSuperAdmin = currentUserRole === "super-admin";
  const canManageRoles = isSuperAdmin || currentUserRole === "admin";

  return (
    <>
      {pageLoading && <Loading text="Updating role..." />}
      <Title text1="Admin" text2="User Management" />
      <div className="my-4">
        <CopyTokenButton />
      </div>
      <div className="relative flex flex-col mt-6 bg-primary/10 border border-primary/20 rounded-lg p-6">
        <BlurCircle top="-100px" left="0" />
        {error ? (
          <p className="text-red-500 text-center py-6">{error}</p>
        ) : users.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No users found.</p>
        ) : (
          <div className="space-y-4">
            {users.map((user) => {
              const isCurrentUser = user.id === currentUserWithRole?.id;
              return (
                <div
                  key={user.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/80 rounded-lg shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={user.image || "/assets/profile_pic.png"}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover border"
                    />
                    <div>
                      <p className="font-semibold text-gray-800">
                        {user.name || "Unnamed"}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>

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
                            user.id,
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
                        {loadingUserId === user.id ? (
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
                        !isSuperAdmin ||
                        isCurrentUser ||
                        (currentUserRole !== "super-admin" &&
                          user.role === "admin")
                      }
                      onClick={() => handleDeleteUser(user.id)}
                      className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg bg-gray-300 text-gray-800 transition-all duration-200 ${
                        !isSuperAdmin ||
                        isCurrentUser ||
                        (currentUserRole !== "super-admin" &&
                          user.role === "admin")
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-gray-400"
                      }`}
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
