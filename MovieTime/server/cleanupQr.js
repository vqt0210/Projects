// cleanupQr.js
import fs from "fs";
import path from "path";

const qrDir = path.join(process.cwd(), "public", "qr");
if (!fs.existsSync(qrDir)) {
  fs.mkdirSync(qrDir, { recursive: true });
  console.log("📂 Created QR directory.");
}

const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
const now = Date.now();

fs.readdirSync(qrDir).forEach((file) => {
  const filePath = path.join(qrDir, file);
  const stats = fs.statSync(filePath);

  if (now - stats.mtimeMs > THREE_DAYS) {
    fs.unlinkSync(filePath);
    console.log(`🧹 Deleted old QR: ${file}`);
  }
});
