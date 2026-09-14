import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  name: { type: String, required: true, trim: true },
}, { timestamps: true });

categorySchema.index({ owner: 1, name: 1 }, { unique: true });

export default mongoose.model("category", categorySchema);