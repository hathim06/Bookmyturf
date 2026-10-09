import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  turf: { type: mongoose.Schema.Types.ObjectId, ref: "turf", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, default: "" },
}, { timestamps: true });

reviewSchema.index({ turf: 1, createdAt: -1 });
reviewSchema.index({ user: 1, turf: 1 }, { unique: true }); // One review per user per turf

export default mongoose.model("review", reviewSchema);
