import Movie from "../models/Movie.js";

// Search theo từ khóa (movie title hoặc casts)
export const searchMoviesAndActors = async (req, res) => {
  try {
    const { q } = req.query;

    // Nếu người dùng chưa nhập gì, trả về rỗng
    if (!q || q.trim() === "") {
      return res.json({ type: "none", results: [] });
    }
    if (q.trim().length < 2) return res.json({ type: "none", results: [] });

    // Regex không phân biệt hoa thường, tìm từ đầu hoặc giữa chuỗi
    const regex = new RegExp(q, "i");

    // Tìm theo tiêu đề phim
    const movies = await Movie.find({ title: regex })
      .limit(8)
      .select("title poster_path release_date casts genres");

    // Tìm theo tên diễn viên (trong mảng casts)
    const actorMovies = await Movie.find({
      "casts.name": { $regex: regex },
    })
      .limit(8)
      .select(
        "title poster_path release_date casts genres runtime vote_average"
      );

    // Tìm tất cả diễn viên trùng tên từ các phim khớp
    let matchedActors = [];
    if (actorMovies.length > 0) {
      const seenIds = new Set();
      actorMovies.forEach((movie) => {
        movie.casts.forEach((actor) => {
          if (regex.test(actor.name) && !seenIds.has(actor.id)) {
            seenIds.add(actor.id);
            matchedActors.push(actor);
          }
        });
      });
    }

    // Nếu tìm thấy phim → type=movie
    if (movies.length > 0)
      return res.json({ type: "movie", keyword: q, results: movies });

    // Nếu không có phim mà có diễn viên → type=actor
    if (actorMovies.length > 0)
      return res.json({
        type: "actor",
        keyword: q,
        profiles: matchedActors,
        results: actorMovies,
      });

    // Không có kết quả
    return res.json({ type: "none", keyword: q, results: [] });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
