// cleanupFiles.js
import fs from "fs";
import path from "path";

const now = Date.now();
let totalFreed = 0;
let deletedCount = 0;

//  Hàm dọn thư mục chung 
function cleanupFolder(dirPath, type, maxAgeDays) {
  if (!fs.existsSync(dirPath)) {
    console.warn(`⚠️ ${type} directory not found, skipping cleanup.`);
    return;
  }

  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(dirPath);

  if (files.length === 0) {
    console.info(`ℹNo files in ${type} directory.`);
    return;
  }

  for (const file of files) {
    try {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtimeMs;

      if (fileAge > maxAgeMs) {
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        fs.unlinkSync(filePath);
        deletedCount++;
        totalFreed += parseFloat(sizeMB);
        console.log(`🧹 Deleted old ${type}: ${file} (${sizeMB} MB)`);
      }
    } catch (err) {
      console.error(`Failed to delete ${type} file ${file}:`, err.message);
    }
  }

  if (deletedCount > 0)
    console.log(`Cleaned ${deletedCount} ${type} file(s) — freed ${totalFreed.toFixed(2)} MB`);
  else console.log(`No old ${type} files found — all fresh.`);
}

// Đường dẫn tới thư mục
const qrDir = path.join(process.cwd(), "public", "qr");
const posterDir = path.join(process.cwd(), "public", "posters");

// Gọi cleanup 
cleanupFolder(qrDir, "QR", 3);       // Xóa file QR > 3 ngày
cleanupFolder(posterDir, "Poster", 30); // Xóa poster > 30 ngày
