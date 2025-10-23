import fs from "fs";
import path from "path";

const qrDir = path.join(process.cwd(), "public", "qr");
const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
const now = Date.now();

if (!fs.existsSync(qrDir)) {
  console.log("⚠️ QR directory not found, skipping cleanup.");
  process.exit(0);
}

fs.readdirSync(qrDir).forEach((file) => {
  const filePath = path.join(qrDir, file);
  const stats = fs.statSync(filePath);

  if (now - stats.mtimeMs > THREE_DAYS) {
    fs.unlinkSync(filePath);
    console.log(`Deleted old QR: ${file}`);
  }
});

console.log("Cleanup finished at", new Date().toLocaleString());
