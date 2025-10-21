import express from "express";
import { checkStripePromo } from "../controllers/stripeController.js";


const stripeRouter = express.Router();

stripeRouter.post("/check-promo", checkStripePromo);

export default stripeRouter;
