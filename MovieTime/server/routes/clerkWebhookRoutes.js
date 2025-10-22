import express from "express";
import { handleClerkWebhook } from "../controllers/clerkController.js";

const router = express.Router();

// Dùng express.raw để giữ nguyên payload JSON cho svix verify
router.post(
  "/clerk",
  express.raw({ type: "application/json" }),
  handleClerkWebhook
);

export default router;
