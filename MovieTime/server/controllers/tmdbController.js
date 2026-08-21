import axios from "axios";
import https from "https";

// Cùng cấu hình https.Agent như showController.js dùng cho các lời gọi TMDB
// khác — bỏ qua kiểm tra chứng chỉ SSL vì cần thiết khi chạy trên mạng có
// kiểm duyệt HTTPS.
const tmdbAgent = new https.Agent({
  rejectUnauthorized: false,
});

function ensureTmdbKey() {
  const k = process.env.TMDB_API_KEY;
  if (!k) throw new Error("TMDB_API_KEY not configured");
  return k.trim();
}

/**
 * Proxy chung cho MỌI endpoint TMDB.
 *
 * Trước đây client (MovieDetails.jsx, Recommend.jsx, ActorDetail.jsx) gọi
 * THẲNG https://api.themoviedb.org từ trình duyệt. Điều này gây 2 vấn đề:
 *
 * 1. Một số mạng/ISP không phân giải được DNS cho api.themoviedb.org (đúng
 *    domain server.js từng phải vá bằng dns.setServers). Trình duyệt không
 *    có cách nào override DNS từ JavaScript như Node làm được — nên lỗi
 *    ERR_CONNECTION_REFUSED sẽ luôn xảy ra với bất kỳ ai gặp vấn đề DNS
 *    tương tự, không có cách sửa từ phía client.
 * 2. VITE_TMDB_BEARER_TOKEN bị nhúng thẳng vào bundle JS, ai cũng xem được
 *    bằng DevTools.
 *
 * Route này nhận mọi path phía sau /api/tmdb/ (vd: search/movie, movie/123,
 * movie/123/videos, movie/123/credits, person/456, person/456/movie_credits)
 * kèm nguyên query string, forward sang TMDB thật ở phía SERVER (nơi đã có
 * sẵn cấu hình DNS + https.Agent hoạt động ổn định), gắn Bearer token ở
 * đây — token không bao giờ lộ ra client — rồi trả kết quả JSON về nguyên
 * bản cho client dùng.
 */
export const proxyTmdb = async (req, res) => {
  try {
    const apiKey = ensureTmdbKey();
    // Express 5 (path-to-regexp v7+): route "/*splat" trả req.params.splat
    // là 1 MẢNG các segment path (vd: /search/movie -> ["search","movie"]),
    // khác với Express 4 cũ (req.params[0] là 1 chuỗi). Join lại thành path.
    const tmdbPath = Array.isArray(req.params.splat)
      ? req.params.splat.join("/")
      : req.params.splat;

    if (!tmdbPath) {
      return res
        .status(400)
        .json({ success: false, message: "Missing TMDB path" });
    }

    const { data } = await axios.get(
      `https://api.themoviedb.org/3/${tmdbPath}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        params: req.query,
        timeout: 10_000,
        httpsAgent: tmdbAgent,
        proxy: false,
      },
    );

    res.json(data);
  } catch (error) {
    console.error(
      "TMDB proxy error:",
      error?.response?.data || error?.message || error,
    );
    res.status(error?.response?.status || 502).json({
      success: false,
      message: error?.message || "Failed to fetch from TMDB",
    });
  }
};
