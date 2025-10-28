import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";
import { clerkClient, getAuth } from "@clerk/express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const recommendMovies = async (req, res) => {
  console.log("===== [START] recommendMovies (Gemini) =====");
  try {
    const { userId: authUserId } = getAuth(req);
    const userId = req.currentUser?.id || authUserId;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const clerkUser = await clerkClient.users.getUser(userId).catch(() => null);
    const favoriteIds = Array.isArray(clerkUser?.privateMetadata?.favorites)
      ? clerkUser.privateMetadata.favorites
      : [];

    const bookings = await Booking.find({ userId, isPaid: true }).populate({
      path: "show",
      populate: { path: "movie" },
    });
    const watchedMovies = bookings.map((b) => b?.show?.movie).filter(Boolean);

    const favoriteMovies = favoriteIds.length
      ? await Movie.find({ _id: { $in: favoriteIds } })
      : [];

    const combinedMovies = [...favoriteMovies, ...watchedMovies];
    const seen = new Set();
    const likedMovieDocs = combinedMovies.filter((m) => {
      const key = m?._id?.toString?.() || m?.title;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (!likedMovieDocs.length)
      return res.json({
        success: true,
        message: "No watch history",
        recommendations: [],
      });

    const likedTitles = likedMovieDocs.map((m) => m.title).filter(Boolean);
    const genreSummary = likedMovieDocs
      .flatMap((m) =>
        Array.isArray(m.genres) ? m.genres.map((g) => g.name) : []
      )
      .slice(0, 10)
      .join(", ");

    const prompt = `
      You are a movie recommendation assistant.
      The user enjoys movies such as: ${likedTitles.join(", ")}.
      Their favorite genres are: ${genreSummary || "unknown"}.
      Suggest 8 similar movies (popular ones available worldwide).
      For each movie, include:
      - title
      - short description (max 20 words)
      - reason why it's recommended based on the user's taste.
      Return pure JSON array, e.g.:
      [
        {"title": "Inception", "description": "Dream within dream thriller.", "reason": "Both have complex sci-fi storytelling"}
      ]
    `;

    console.log("[PROMPT]", prompt);

    // Guard for missing API key
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ success: false, message: "Missing GEMINI_API_KEY" });
    }

    // Call Gemini model properly
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    console.log("[STEP] Calling Gemini...");

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log("[RAW RESPONSE]", text);

    // Parse JSON 
    let recommendations = [];
    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      recommendations = JSON.parse(cleaned);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      recommendations = match ? JSON.parse(match[0]) : [];
    }

    res.json({ success: true, recommendations });
  } catch (error) {
    console.error("[ERROR] recommendMovies (Gemini)", error);
    res.status(500).json({
      success: false,
      message: "Gemini AI recommendation failed",
    });
  }
};
