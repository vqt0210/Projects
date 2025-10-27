import { useAppContext } from "@/context/AppContext";
import { CheckIcon, ClipboardIcon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export const CopyTokenButton = () => {
  const [copied, setCopied] = useState(false);
  const { getToken } = useAppContext();

  const handleCopyToken = async () => {
    try {
      const token = await getToken();
      if (!token) return toast.error("No token found!");
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success("Token copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Clipboard failed");
      console.error("Clipboard error:", err);
    }
  };

  return (
    <button
      onClick={handleCopyToken}
      className="flex items-center gap-2 px-4 py-2 text-white transition rounded-lg cursor-pointer bg-primary hover:bg-primary/80"
    >
      {copied ? <CheckIcon size={16} /> : <ClipboardIcon size={16} />}
      {copied ? "Copied!" : "Copy Token"}
    </button>
  );
};
