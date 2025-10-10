import { useAuth, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";

const AdminPanel = () => {
  const { getToken } = useAuth();
  const { isLoaded, user } = useUser();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!isLoaded || !user) return; // ⛔ chỉ chạy sau khi Clerk load xong và có user

    const fetchData = async () => {
      try {
        const token = await getToken({ skipCache: true });
        console.log("Bearer Token:", token); // ✅ bây giờ chắc chắn sẽ thấy log

        const response = await fetch(
          `${import.meta.env.VITE_BASE_URL}/api/admin/users`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log("BASE_URL:", import.meta.env.VITE_BASE_URL);


        if (!response.ok)
          throw new Error(`Error fetching users: ${response.statusText}`);

        const data = await response.json();
        setUsers(data.users || []);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };

    fetchData();
  }, [isLoaded, user, getToken]); // chạy lại khi Clerk load xong

  return (
    <div>
      <h1>Admin Panel</h1>
      <h2>User List</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.name} - {user.email} - {user.role}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminPanel;
