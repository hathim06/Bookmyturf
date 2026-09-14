import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  turf: { type: mongoose.Schema.Types.ObjectId, ref: "turf", required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true, trim: true },
  endTime: { type: String, required: true, trim: true },
  sport: { type: String, trim: true, default: "" },
  amount: { type: Number, required: true, min: 0 },
  ownerName: { type: String, trim: true, default: '' },
  ownerPhone: { type: String, trim: true, default: '' },
  cancellationReason: { type: String, trim: true, default: '' },
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "completed"],
    default: "pending",
  },
}, { timestamps: true });

export default mongoose.model("booking", bookingSchema);
