import axios from "axios";
import fs from "fs";
import path from "path";

/**
 * Tải poster từ TMDB và lưu vào /public/posters/
 * Nếu đã tồn tại thì không tải lại.
 * Trả về URL ảnh trên domain server.teasonmike.io.vn
 */
export async function downloadPoster(posterPath, movieId) {
  if (!posterPath) return "https://teasonmike.io.vn/assets/fallBack.jpg";

  const posterUrl = `https://image.tmdb.org/t/p/w500${posterPath}`;
  const posterDir = path.join(process.cwd(), "public", "posters");
  const filePath = path.join(posterDir, `${movieId}.jpg`);

  if (!fs.existsSync(posterDir)) fs.mkdirSync(posterDir, { recursive: true });

  try {
    if (!fs.existsSync(filePath)) {
      const response = await axios.get(posterUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(filePath, response.data);
      console.log(`✅ Poster saved: ${filePath}`);
    }
    return `https://server.teasonmike.io.vn/posters/${movieId}.jpg`;
  } catch (error) {
    console.error(`❌ Failed to download poster: ${posterUrl}`, error.message);
    return "https://teasonmike.io.vn/assets/fallBack.jpg";
  }
}
