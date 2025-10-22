import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // Clerk ID
    clerkId: { type: String, default: null },
    name: { type: String },
    email: { type: String, default: null },
    image: { type: String, default: null },
    role: { type: String, enum: ["user", "admin", "super-admin"], default: "user" },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
