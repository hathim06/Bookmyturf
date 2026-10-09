import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    plan: {
      type: String,
      enum: ["monthly", "basic", "standard", "premium"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled", "pending"],
      default: "active",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentId: { type: String, default: null },
    orderId: { type: String, default: null },
    autoRenew: { type: Boolean, default: false },
    features: {
      maxTurfs: { type: Number, default: 1 },
      analyticsAccess: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

subscriptionSchema.index({ owner: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });

export default mongoose.model("subscription", subscriptionSchema);
