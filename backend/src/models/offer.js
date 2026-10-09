import mongoose from "mongoose";

const offerSchema = new mongoose.Schema({
  turf: { type: mongoose.Schema.Types.ObjectId, ref: "turf", required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
  discountType: {
    type: String,
    enum: ["percentage", "flat"],
    default: "percentage",
  },
  discountValue: { type: Number, required: true, min: 0 },
  // Optional: restrict to certain days or date range
  validFrom: { type: Date },
  validTo: { type: Date },
  daysOfWeek: {
    type: [Number], // 0=Sun, 1=Mon, ... 6=Sat; empty = all days
    default: [],
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

offerSchema.index({ turf: 1, isActive: 1 });
offerSchema.index({ owner: 1, isActive: 1 });

export default mongoose.model("offer", offerSchema);
