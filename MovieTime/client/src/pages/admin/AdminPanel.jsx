import { useState, useEffect } from "react";
import { authorizedApi } from "../../utils/api";
import { Shield, ShieldOff, Trash2 } from "lucide-react";
import Title from "../../components/admin/Title";
import BlurCircle from "../../components/BlurCircle";
import Loading from "../../components/Loading";
import { toast } from "react-hot-toast";
import { useAppContext } from "../../context/AppContext";

const AdminPanel = () => {
  const { getToken, user: currentUser } = useAppContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false); // loading khi navigate
  const [error, setError] = useState(null);
  const [loadingUserId, setLoadingUserId] = useState(null); // Trạng thái loading cho từng user

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
    // Chỉ fetch khi user đã load
    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser, getToken]);

  // Update role (promote/revoke)
  const handleRoleChange = async (userId, newRole) => {
    setLoadingUserId(userId); // Đánh dấu user đang cập nhật
    try {
      const authApi = await authorizedApi(getToken);
      await authApi.patch(`/api/admin/update-role/${userId}`, {
        role: newRole,
      });

      // Cập nhật lại danh sách người dùng
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      toast.success(
        `User ${newRole === "admin" ? "promoted" : "revoked"} successfully`
      );
    } catch (err) {
      toast.error("Failed to update role");
    } finally {
      setLoadingUserId(null); // Reset loading sau khi xong
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this user?"
    );
    if (!confirmDelete) return;

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

  return (
    <>
      {pageLoading && <Loading text="Updating role..." />}
      <Title text1="Admin" text2="User Management" />
      <div className="relative flex flex-col mt-6 bg-primary/10 border border-primary/20 rounded-lg p-6">
        <BlurCircle top="-100px" left="0" />
        {error ? (
          <p className="text-red-500 text-center py-6">{error}</p>
        ) : users.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No users found.</p>
        ) : (
          <div className="space-y-4">
            {users.map((user) => {
              const isCurrentUser = user.id === currentUser?.id;
              return(
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
                      user.role === "admin"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {user.role}
                  </span>
                  <button
                    disabled={loadingUserId === user.id || isCurrentUser}
                    onClick={() =>
                      handleRoleChange(
                        user.id,
                        user.role === "admin" ? "user" : "admin"
                      )
                    }
                    className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                      user.role === "admin"
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-blue-500 hover:bg-blue-600"
                    } text-white disabled:opacity-60 disabled:cursor-not-allowed`}
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

                  {/* Delete */}
                  {user.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-800 transition-all duration-200"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  )}
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
