import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";
import { clerkClient } from "@clerk/express";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const recommendMovies = async (req, res) => {
  try {
    const userId = req.currentUser?.id || req.auth?.userId;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    // Favorites from Clerk (array of Movie ObjectIds)
    const clerkUser = await clerkClient.users.getUser(userId).catch(() => null);
    const favoriteIds = Array.isArray(clerkUser?.privateMetadata?.favorites)
      ? clerkUser.privateMetadata.favorites
      : [];

    // Watched movies from paid bookings
    const bookings = await Booking.find({ userId, isPaid: true }).populate({
      path: "show",
      populate: { path: "movie" },
    });
    const watchedMovieDocs = bookings
      .map((b) => b?.show?.movie)
      .filter(Boolean);

    // Load favorite movie docs and merge
    const favoriteMovieDocs = favoriteIds.length
      ? await Movie.find({ _id: { $in: favoriteIds } })
      : [];
    const combinedDocs = [...favoriteMovieDocs, ...watchedMovieDocs];

    // De-duplicate docs (by _id string or title fallback)
    const seen = new Set();
    const likedMovieDocs = combinedDocs.filter((m) => {
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
      .flatMap((m) => (Array.isArray(m.genres) ? m.genres.map((g) => g.name) : []))
      .slice(0, 10)
      .join(", ");

    const prompt = `
      You are a movie recommendation assistant.
      The user enjoys movies such as: ${likedTitles.join(", ")}.
      Their favorite genres are: ${genreSummary || "unknown"}.

      Suggest 5 similar movies (popular ones available worldwide).
      For each movie, include:
      - title
      - short description (max 20 words)
      - reason why it's recommended based on the user's taste.

      Return JSON array in this format:
      [
        { "title": "Inception", "description": "Dreams within dreams thriller.", "reason": "Both share complex sci-fi storytelling" }
      ]
    `;

    if (!process.env.OPENAI_API_KEY)
      return res
        .status(500)
        .json({ success: false, message: "Missing OpenAI API key" });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });

    const text = completion.choices?.[0]?.message?.content || "[]";
    let recommendations = [];
    try {
      recommendations = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      recommendations = match ? JSON.parse(match[0]) : [];
    }

    res.json({ success: true, recommendations });
  } catch (error) {
    console.error("recommendMovies error:", error);
    res
      .status(500)
      .json({ success: false, message: "AI recommendation failed" });
  }
};

