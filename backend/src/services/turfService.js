import mongoose from "mongoose";
import turfModel from "../models/turf.js";

const publicFilter = {
  status: "Active",
  isBlocked: false,
  isListed: true,
  isDeleted: false,
};

export const listPublicTurfs = async ({
  search = "",
  city = "",
  sport = "",
  category = "",
  turfType = "",
  facility = "",
  minPrice,
  maxPrice,
  sort = "newest",
  page = 1,
  limit = 5,
}) => {
  const filter = { ...publicFilter };
  if (search)
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { "location.city": { $regex: search, $options: "i" } },
      { "location.address": { $regex: search, $options: "i" } },
      { sports: { $regex: search, $options: "i" } },
    ];
  if (city) filter["location.city"] = { $regex: city, $options: "i" };
  if (sport) filter.sports = { $regex: sport, $options: "i" };
  if (category) filter.category = { $regex: category, $options: "i" };
  if (turfType) filter.turfType = turfType;
  if (facility) filter.facilities = { $regex: facility, $options: "i" };
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.pricePerHour = {};
    if (minPrice !== undefined && Number.isFinite(Number(minPrice)))
      filter.pricePerHour.$gte = Number(minPrice);
    if (maxPrice !== undefined && Number.isFinite(Number(maxPrice)))
      filter.pricePerHour.$lte = Number(maxPrice);
  }
  const sortMap = {
    newest: { createdAt: -1 },
    "price-asc": { pricePerHour: 1 },
    "price-desc": { pricePerHour: -1 },
    rating: { createdAt: -1 },
  };
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 5));
  const [turfs, totalItems] = await Promise.all([
    turfModel
      .find(filter)
      .populate("owner", "name")
      .sort(sortMap[sort] || sortMap.newest)
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    turfModel.countDocuments(filter),
  ]);
  return {
    success: true,
    data: turfs,
    pagination: {
      currentPage: safePage,
      totalPages: Math.max(1, Math.ceil(totalItems / safeLimit)),
      totalItems,
      limit: safeLimit,
    },
  };
};

export const getPublicTurf = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new Error("Invalid turf id.");
  const turf = await turfModel
    .findOne({ _id: id, ...publicFilter })
    .populate("owner", "name profilePicture");
  if (!turf) throw new Error("Turf not found.");
  return turf;
};
