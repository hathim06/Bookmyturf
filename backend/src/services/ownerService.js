import turfModel from "../models/turf.js";
import bookingModel from "../models/booking.js";

const listFromText = (value) =>
  Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
const listFromPayload = (value) => {
  if (Array.isArray(value))
    return value.map((item) => String(item).trim()).filter(Boolean);
  try {
    const parsed = JSON.parse(String(value || ""));
    if (Array.isArray(parsed))
      return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {
    return listFromText(value);
  }
  return listFromText(value);
};
const parseSlots = (value, defaultPrice) => {
  if (value === undefined) return undefined;
  try {
    const slots = Array.isArray(value) ? value : JSON.parse(value || "[]");
    return slots
      .filter((slot) => slot.startTime && slot.endTime)
      .map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        price: Number(
          slot.price === "" || slot.price === undefined
            ? defaultPrice
            : slot.price,
        ),
      }));
  } catch {
    return [];
  }
};
const timeMinutes = (value) => {
  const [hours, minutes] = String(value || "")
    .split(":")
    .map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes)
    ? hours * 60 + minutes
    : NaN;
};
const turfData = (body) => {
  const images =
    body.images === undefined
      ? undefined
      : Array.isArray(body.images)
        ? body.images
        : listFromText(body.images);
  let price = Number(body.pricePerHour);
  if (!Number.isFinite(price)) {
    try {
      const submittedSlots = Array.isArray(body.slots)
        ? body.slots
        : JSON.parse(body.slots || "[]");
      price = Number(submittedSlots[0]?.price);
    } catch {
      price = 0;
    }
  }
  if (!Number.isFinite(price)) price = 0;
  const categories = listFromPayload(body.categories).length
    ? listFromPayload(body.categories)
    : listFromPayload(body.category);
  const slots = parseSlots(body.slots, price);
  return {
    name: body.name,
    description: body.description,
    category: categories[0] || body.category || "Other",
    categories: categories.length ? categories : [body.category || "Other"],
    turfType: body.turfType || "Outdoor",
    sports: categories.length ? categories : listFromText(body.sports),
    facilities: listFromText(body.facilities),
    pricePerHour: price,
    contactNumber: body.contactNumber || "",
    openingTime: body.openingTime || "06:00",
    closingTime: body.closingTime || "22:00",
    ...(slots ? { slots } : {}),
    rules: body.rules || "",
    ...(images
      ? { images, primaryImage: body.primaryImage || images[0] || "" }
      : {}),
    address: body.address || "",
    location: {
      address: body.address,
      city: body.city,
      state: body.state,
      country: body.country,
      pincode: body.pincode,
      latitude:
        body.latitude === "" || body.latitude === undefined
          ? undefined
          : Number(body.latitude),
      longitude:
        body.longitude === "" || body.longitude === undefined
          ? undefined
          : Number(body.longitude),
    },
  };
};
const isValidTurf = (data) => {
  if (
    !data.name ||
    !data.location.address ||
    !data.location.city ||
    !data.sports.length ||
    !Number.isFinite(data.pricePerHour) ||
    data.pricePerHour < 0 ||
    data.openingTime >= data.closingTime
  )
    return false;
  if (!data.slots) return true;
  const opening = timeMinutes(data.openingTime);
  const closing = timeMinutes(data.closingTime);
  const slots = data.slots
    .map((slot) => ({
      ...slot,
      start: timeMinutes(slot.startTime),
      end: timeMinutes(slot.endTime),
    }))
    .sort((a, b) => a.start - b.start);
  return (
    slots.length > 0 &&
    slots.every(
      (slot, index) =>
        Number.isFinite(slot.start) &&
        Number.isFinite(slot.end) &&
        Number.isFinite(slot.price) &&
        slot.price >= 0 &&
        slot.start >= opening &&
        slot.end <= closing &&
        slot.end > slot.start &&
        (!slots[index - 1] || slots[index - 1].end <= slot.start),
    )
  );
};
export const createOwnerTurf = async (body, ownerId) => {
  const data = turfData(body);
  if (!isValidTurf(data))
    throw new Error(
      "Turf name, address, city, categories, and valid hours are required.",
    );
  return turfModel.create({ ...data, owner: ownerId });
};
export const getOwnerTurfs = async (
  ownerId,
  search = "",
  page = 1,
  limit = 5,
) => {
  const filter = {
    owner: ownerId,
    isDeleted: false,
    $or: [
      { name: { $regex: search, $options: "i" } },
      { "location.city": { $regex: search, $options: "i" } },
      { "location.address": { $regex: search, $options: "i" } },
    ],
  };
  const [turfs, total] = await Promise.all([
    turfModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    turfModel.countDocuments(filter),
  ]);
  return {
    turfs,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};
export const updateOwnerTurf = async (id, body, ownerId) => {
  const data = turfData(body);
  if (!isValidTurf(data))
    throw new Error(
      "Turf name, address, city, categories, and valid hours are required.",
    );
  const turf = await turfModel.findOneAndUpdate(
    { _id: id, owner: ownerId, isDeleted: false },
    data,
    { new: true, runValidators: true },
  );
  if (!turf) throw new Error("Turf not found.");
  return turf;
};
export const setOwnerTurfListed = async (id, isListed, ownerId) => {
  const turf = await turfModel.findOneAndUpdate(
    { _id: id, owner: ownerId },
    { isListed: Boolean(isListed) },
    { new: true },
  );
  if (!turf) throw new Error("Turf not found.");
  return turf;
};
export const deleteOwnerTurf = async (id, ownerId) => {
  const turf = await turfModel.findOneAndDelete({ _id: id, owner: ownerId });
  if (!turf) throw new Error("Turf not found.");
  await bookingModel.deleteMany({ turf: turf._id });
  return turf;
};
export const getOwnerBookings = async (ownerId) => {
  const turfs = await turfModel.find({ owner: ownerId }).select("_id");
  const turfIds = turfs.map((t) => t._id);
  const bookings = await bookingModel
    .find({ turf: { $in: turfIds } })
    .populate("user", "name email phone profilePicture")
    .populate("turf", "name")
    .sort({ date: -1 });
  return bookings;
};
