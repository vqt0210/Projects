// server/scripts/fixShowPrice.js
import "dotenv/config";
import mongoose from "mongoose";
import Show from "./models/Show.js";

async function run() {
  await mongoose.connect(`${process.env.MONGODB_URI}/movietime`);

  // Tìm mọi show mà showPrice hiện đang là object
  const shows = await Show.find({});
  let fixedCount = 0;

  for (const show of shows) {
    const raw = show.showPrice;
    if (typeof raw === "object" && raw !== null) {
      const correctPrice = Number(raw.adult) || 0;
      await Show.updateOne(
        { _id: show._id },
        { $set: { showPrice: correctPrice } },
      );
      console.log(
        `Fixed show ${show._id}: ${JSON.stringify(raw)} → ${correctPrice}`,
      );
      fixedCount++;
    }
  }

  console.log(`Done. Fixed ${fixedCount} show(s).`);
  await mongoose.disconnect();
}

run();
