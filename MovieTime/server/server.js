import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import "dotenv/config";
import { clerkMiddleware } from "@clerk/express";
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import connectDB from "./configs/db.js";
import http from "http";
import { Server } from "socket.io";

// Routes
import showRouter from "./routes/showRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import userRouter from "./routes/userRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import actorRoutes from "./routes/actorRoutes.js";
import meRouter from "./routes/me.js";
import stripeRouter from "./routes/stripeRoutes.js";
import { stripeWebhooks } from "./controllers/stripeController.js";
import webhookRouter from "./routes/clerkWebhookRoutes.js";
import ticketRouter from "./routes/ticketRoutes.js";

import fs from "fs";
import path from "path";

const dirs = ["public/qr", "public/posters"];
dirs.forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`📁 Created missing directory: ${dir}`);
  }
});

const app = express();
app.set("trust proxy", 1);
app.use(helmet());

// Server & Middleware

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";
const allowedOrigins = ["https://teasonmike.io.vn", "http://localhost:5173", "https://www.teasonmike.io.vn",];

app.use(
  cors({
    origin: (origin, cb) =>
      cb(null, !origin || allowedOrigins.includes(origin)),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check

app.get("/healthz", (req, res) => res.status(200).send("ok"));

// Stripe Webhook

app.post(
  "/api/stripe/webhooks",
  express.raw({ type: "application/json" }),
  stripeWebhooks
);

// Global Middlewares
app.use(express.json({ limit: "1mb" }));
app.use(clerkMiddleware());
app.use("/api/inngest", serve({ client: inngest, functions }));

// API Routes
app.get("/", (req, res) => res.send("MovieTime Server is Live!"));
app.use("/api/show", showRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);
app.use("/api/search", searchRoutes);
app.use("/api/actors", actorRoutes);
app.use("/api/me", meRouter);
app.use("/api/stripe", stripeRouter);
app.use("/api/webhooks", webhookRouter);
app.use("/api/ticket", ticketRouter);
app.use("/qr", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://teasonmike.io.vn");
  res.header("Access-Control-Allow-Methods", "GET");
  res.header("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static("public/qr"));
app.use("/posters", express.static("public/posters"));

// 404 + Error handler
app.use((req, res) =>
  res.status(404).json({ success: false, message: "Not found" })
);
app.use((err, req, res, next) => {
  console.error("Internal error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// Create HTTP + Socket.IO server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Gắn vào global để controller có thể emit
global._io = io;

// Khi client kết nối
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on("disconnect", () => console.log(`Socket disconnected: ${socket.id}`));
});

// Start Server

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;

// DB Connection + Retry
const bootDB = async (retry = 0) => {
  try {
    await connectDB();
  } catch (err) {
    if (retry < 5) {
      const delay = Math.min(2000 * 2 ** retry, 10000);
      console.warn(`Retry DB connection in ${delay}ms...`);
      setTimeout(() => bootDB(retry + 1), delay);
    } else {
      console.error("Failed to connect to DB after multiple attempts.");
    }
  }
};
bootDB();

// Graceful Shutdown

const shutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);

  server.close(async (err) => {
    if (err) {
      console.error("Error closing server:", err);
      process.exit(1);
    }

    try {
      await mongoose.disconnect();
      console.log("MongoDB disconnected.");
    } catch (e) {
      console.error("Error disconnecting MongoDB:", e);
    }

    process.exit(0);
  });

  // Force exit after 30s
  setTimeout(() => {
    console.warn("Force shutdown due to timeout");
    process.exit(1);
  }, 30 * 1000);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
