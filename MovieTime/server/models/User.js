import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true }, 
  clerkId: { type: String, default: null },
  name: { type: String },
  email: { type: String, default: null },
  image: { type: String, default: null },
});

const User = mongoose.model("User", userSchema);
export default User;
