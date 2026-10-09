import mongoose from "mongoose";
import turfModel from "../models/turf.js";
import offerModel from "../models/offer.js";
import bookingModel from "../models/booking.js";
import { isOfferValidOnDate, utcTodayKey } from "../../utils/offerDates.js";

const publicFilter = {
  status: "Active",
  isBlocked: false,
  isListed: true,
  isDeleted: false,
};

// Fetch active offers for a list of turf IDs
const getActiveOffersForTurfs = async (turfIds) => {
  const offers = await offerModel
    .find({
      turf: { $in: turfIds },
      isActive: true,
    })
    .lean();
  const todayKey = utcTodayKey();
  const valid = offers.filter((offer) => isOfferValidOnDate(offer, todayKey));
  // Group by turf
  const map = {};
  for (const offer of valid) {
    const key = String(offer.turf);
    if (!map[key]) map[key] = [];
    map[key].push(offer);
  }
  return map;
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
  date = "",
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
    rating: { averageRating: -1, reviewCount: -1 },
  };
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 5));
  let turfs;
  let totalItems;
  if (date) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
    if (!match) throw new Error("Choose a valid availability date.");
    const selectedDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (selectedDate.getFullYear() !== Number(match[1]) || selectedDate.getMonth() !== Number(match[2]) - 1 || selectedDate.getDate() !== Number(match[3]))
      throw new Error("Choose a valid availability date.");
    const candidates = await turfModel.find(filter).populate("owner", "name").sort(sortMap[sort] || sortMap.newest).lean();
    const now = new Date();
    const bookings = await bookingModel.find({
      date: selectedDate,
      $or: [
        { status: { $in: ["confirmed", "completed"] } },
        { status: "pending", paymentMethod: "razorpay", paymentHoldUntil: { $gt: now } },
      ],
    }).select("turf startTime endTime").lean();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const available = candidates.filter((turf) =>
      (turf.slots || []).some((slot) => {
        const [hours, minutes] = slot.startTime.split(":").map(Number);
        const slotStart = new Date(selectedDate);
        slotStart.setHours(hours, minutes, 0, 0);
        const booked = bookings.some((booking) =>
          String(booking.turf) === String(turf._id) &&
          booking.startTime < slot.endTime && booking.endTime > slot.startTime,
        );
        return selectedDate >= today && slotStart > now && !booked;
      }),
    );
    totalItems = available.length;
    turfs = available.slice((safePage - 1) * safeLimit, safePage * safeLimit);
  } else {
    [turfs, totalItems] = await Promise.all([
      turfModel
        .find(filter)
        .populate("owner", "name")
        .sort(sortMap[sort] || sortMap.newest)
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      turfModel.countDocuments(filter),
    ]);
  }

  // Attach active offers to each turf
  const turfIds = turfs.map((t) => t._id);
  const offersMap = await getActiveOffersForTurfs(turfIds);
  const turfsWithOffers = turfs.map((turf) => ({
    ...turf,
    activeOffers: offersMap[String(turf._id)] || [],
  }));

  return {
    success: true,
    turfs: turfsWithOffers,
    data: turfsWithOffers,
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
    .populate("owner", "name profilePicture")
    .lean();
  if (!turf) throw new Error("Turf not found.");

  // Attach active offers
  const todayKey = utcTodayKey();
  const activeOffers = await offerModel
    .find({ turf: turf._id, isActive: true })
    .lean()
    .then((offers) =>
      offers.filter((offer) => isOfferValidOnDate(offer, todayKey)),
    );

  return { ...turf, activeOffers };
};
