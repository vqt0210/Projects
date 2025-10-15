import { useState } from "react";
import { ClipboardIcon, CheckIcon } from "lucide-react";
import toast from "react-hot-toast";

export const CopyTokenButton = ({ token }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyToken = async () => {
    try {
      if (!document.hasFocus()) {
        window.focus(); // 🔧 focus lại document nếu bị mất
      }

      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success("Token copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);

      // fallback: dùng cách cũ nếu Clipboard API fail
      const textArea = document.createElement("textarea");
      textArea.value = token;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success("Token copied (fallback)");
      } catch (fallbackErr) {
        toast.error("Clipboard unavailable");
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  return (
    <button
      onClick={handleCopyToken}
      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition cursor-pointer"
    >
      {copied ? <CheckIcon size={16} /> : <ClipboardIcon size={16} />}
      {copied ? "Copied!" : "Copy Token"}
    </button>
  );
};
