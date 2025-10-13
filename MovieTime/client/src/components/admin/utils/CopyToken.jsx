// src/components/admin/CopyTokenButton.jsx
import { useAuth, useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";

export const CopyTokenButton = () => {
  const { getToken } = useAuth(); // useAuth provides getToken
  const { user } = useUser(); // optional, only if you need user info

  const handleCopyToken = async () => {
    if (!user) return alert("Not logged in");

    try {
      const token = await getToken({ skipCache: true });
      await navigator.clipboard.writeText(token);
      toast.success("Token copied to clipboard!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to get token");
    }
  };

  return (
    <button
      onClick={handleCopyToken}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition cursor-pointer"
    >
      Get Admin Token
    </button>
  );
};
