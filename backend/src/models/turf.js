import mongoose from "mongoose";

const turfSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
  category: { type: String, trim: true, default: "Other" },
  categories: { type: [String], default: [] },
  turfType: { type: String, trim: true, default: "Outdoor" },
  sports: { type: [String], default: [] },
  facilities: { type: [String], default: [] },
  pricePerHour: { type: Number, required: true, min: 0 },
  offerPrice: { type: Number, min: 0 },
  offerTitle: { type: String, trim: true, default: "" },
  contactNumber: { type: String, trim: true, default: "" },
  openingTime: { type: String, trim: true, default: "06:00" },
  closingTime: { type: String, trim: true, default: "22:00" },
  slots: [{
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
  }],
  images: { type: [String], default: [] },
  primaryImage: { type: String, default: "" },
  rules: { type: String, trim: true, default: "" },
  status: { type: String, enum: ["Active", "Blocked", "Pending", "Inactive"], default: "Active" },
  isBlocked: { type: Boolean, default: false },
  isListed: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  address: { type: String, trim: true, default: "" },
  location: {
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
}, { timestamps: true });

turfSchema.index({ "location.city": 1, pricePerHour: 1 });
turfSchema.index({ sports: 1, status: 1, isListed: 1 });
turfSchema.index({ category: 1, status: 1, isListed: 1 });
turfSchema.index({ owner: 1, isDeleted: 1 });
turfSchema.index({ averageRating: -1, reviewCount: -1 });

export default mongoose.model("turf", turfSchema);
