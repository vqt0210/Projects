import Movie from "../models/Movie.js"

// Lấy thông tin diễn viên & phim họ đóng 
export const getActorDetail = async (req, res) => {
  try {
    const actorId = parseInt(req.params.id)

    // Tìm tất cả phim có actor này
    const movies = await Movie.find({
      "casts.id": actorId
    }).select("title poster_path backdrop_path release_date genres runtime vote_average casts")

    if (!movies.length) {
      return res.json({ success: false, message: "Actor not found in DB" })
    }

    // Lấy thông tin diễn viên từ phim đầu tiên
    const actorData = movies[0].casts.find(c => c.id === actorId)

    return res.json({
      success: true,
      actor: actorData,
      movies
    })
  } catch (err) {
    console.error("getActorDetail error:", err)
    res.status(500).json({ success: false, message: "Server error" })
  }
}
