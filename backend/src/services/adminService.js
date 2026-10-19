import userModel from "../models/user.js";
import turfModel from "../models/turf.js";
import bookingModel from "../models/booking.js";

export const getManagedUsers = async (
  role,
  search = "",
  page = 1,
  limit = 5,
) => {
  if (!["user", "owner"].includes(role))
    throw new Error("Choose either user or owner.");
  const filter = {
    role,
    $or: [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ],
  };
  const [users, total] = await Promise.all([
    userModel
      .find(filter)
      .select("-password")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    userModel.countDocuments(filter),
  ]);
  return {
    users,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

export const getManagedBookings = async (search = "", page = 1, limit = 5) => {
  const filter = search
    ? {
        $or: [
          { "user.name": { $regex: search, $options: "i" } },
          { "turf.name": { $regex: search, $options: "i" } },
          { status: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const [bookings, total] = await Promise.all([
    bookingModel
      .find(filter)
      .populate("user", "name email phone")
      .populate("turf", "name location pricePerHour")
      .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    bookingModel.countDocuments(filter),
  ]);

  return {
    bookings,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

export const setUserBlocked = async (id, isBlocked) => {
  const user = await userModel
    .findOneAndUpdate(
      { _id: id, role: { $in: ["user", "owner"] } },
      { isBlocked: Boolean(isBlocked) },
      { new: true },
    )
    .select("-password");
  if (!user) throw new Error("User not found.");
  return user;
};
export const deleteManagedUser = async (id) => {
  const user = await userModel.findOneAndDelete({
    _id: id,
    role: { $in: ["user", "owner"] },
  });
  if (!user) throw new Error("User not found.");
  if (user.role === "owner") await turfModel.deleteMany({ owner: user._id });
  await bookingModel.deleteMany({ user: user._id });
};
export const getManagedUserDetails = async (id) => {
  const user = await userModel
    .findOne({ _id: id, role: { $in: ["user", "owner"] } })
    .select("-password");
  if (!user) throw new Error("User not found.");
  if (user.role === "owner")
    return {
      user,
      turfs: await turfModel.find({ owner: user._id }).sort({ createdAt: -1 }),
      bookings: [],
    };
  return {
    user,
    turfs: [],
    bookings: await bookingModel
      .find({ user: user._id })
      .populate("turf", "name location pricePerHour")
      .sort({ date: -1 }),
  };
};
export const getManagedTurfs = async (search = "", page = 1, limit = 5) => {
  const filter = {
    isDeleted: { $ne: true },
    $or: [
      { name: { $regex: search, $options: "i" } },
      { "location.city": { $regex: search, $options: "i" } },
    ],
  };
  const [turfs, total] = await Promise.all([
    turfModel
      .find(filter)
      .populate("owner", "name email")
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
export const setManagedTurfListed = async (id, isListed) => {
  const turf = await turfModel
    .findByIdAndUpdate(id, { isListed: Boolean(isListed) }, { new: true })
    .populate("owner", "name email");
  if (!turf) throw new Error("Turf not found.");
  return turf;
};
export const setManagedTurfStatus = async (id, status) => {
  if (!["Active", "Blocked", "Pending", "Inactive"].includes(status))
    throw new Error("Invalid turf status.");
  const turf = await turfModel
    .findByIdAndUpdate(
      id,
      {
        status,
        isBlocked: status === "Blocked",
        isListed: status === "Active",
      },
      { new: true },
    )
    .populate("owner", "name email");
  if (!turf) throw new Error("Turf not found.");
  return turf;
};
export const deactivateManagedTurf = async (id) => {
  const turf = await turfModel
    .findByIdAndDelete(id)
    .populate("owner", "name email");
  if (!turf) throw new Error("Turf not found.");
  await bookingModel.deleteMany({ turf: turf._id });
  return turf;
};
