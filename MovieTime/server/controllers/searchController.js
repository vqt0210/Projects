import Movie from "../models/Movie.js";

export const searchMoviesAndActors = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2)
      return res.json({ type: "none", results: [] });

    // Ưu tiên dùng Atlas Search (nếu có index) ====
    const atlasResults = await Movie.aggregate([
      {
        $search: {
          index: "movie_search", // hoặc "default" nếu bạn để nguyên
          compound: {
            should: [
              {
                text: {
                  query: q,
                  path: "title",
                  fuzzy: { maxEdits: 2 }, // cho phép sai chính tả nhẹ
                },
              },
              {
                text: {
                  query: q,
                  path: "casts.name",
                  fuzzy: { maxEdits: 2 },
                },
              },
            ],
          },
        },
      },
      { $limit: 15 },
      {
        $project: {
          title: 1,
          poster_path: 1,
          release_date: 1,
          casts: 1,
          genres: 1,
          score: { $meta: "searchScore" },
        },
      },
    ]);

    // Nếu Atlas Search ra kết quả
    if (atlasResults.length > 0) {
      const movies = atlasResults.slice(0, 8);
      const matchedActors = [];

      const seen = new Set();
      movies.forEach((m) =>
        m.casts?.forEach((c) => {
          if (regex.test(c?.name) && !seen.has(c.id)) {
            seen.add(c.id);
            matchedActors.push(c);
          }
        })
      );

      const actors = matchedActors.slice(0, 5);

      if (movies.length > 0 && actors.length > 0)
        return res.json({ type: "both", keyword: q, movies, profiles: actors });

      if (movies.length > 0)
        return res.json({ type: "movie", keyword: q, results: movies });

      if (actors.length > 0)
        return res.json({
          type: "actor",
          keyword: q,
          profiles: actors,
          results: [],
        });
    }

    // Nếu không có Atlas Search hoặc lỗi → fallback Regex 
    const regex = new RegExp(q, "i");
    const movies = await Movie.find({ title: regex })
      .limit(8)
      .select("title poster_path release_date casts genres");

    const actorMovies = await Movie.find({ "casts.name": regex })
      .limit(8)
      .select("title poster_path release_date casts genres");

    let matchedActors = [];
    const seen = new Set();
    actorMovies.forEach((m) =>
      m.casts.forEach((c) => {
        if (regex.test(c.name) && !seen.has(c.id)) {
          seen.add(c.id);
          matchedActors.push(c);
        }
      })
    );

    matchedActors = matchedActors.slice(0, 5);

    if (movies.length > 0 && matchedActors.length > 0)
      return res.json({ type: "both", keyword: q, movies, profiles: matchedActors });

    if (movies.length > 0)
      return res.json({ type: "movie", keyword: q, results: movies });

    if (matchedActors.length > 0)
      return res.json({
        type: "actor",
        keyword: q,
        profiles: matchedActors,
        results: actorMovies,
      });

    return res.json({ type: "none", keyword: q, results: [] });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
