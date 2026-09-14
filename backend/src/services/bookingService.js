import mongoose from "mongoose";
import bookingModel from "../models/booking.js";
import turfModel from "../models/turf.js";
import userModel from "../models/user.js";
import transporter from "../config/email.js";

const minutes = (time) => {
  const [hours, mins] = String(time || "")
    .split(":")
    .map(Number);
  return Number.isFinite(hours) && Number.isFinite(mins)
    ? hours * 60 + mins
    : NaN;
};

export const createBooking = async (
  userId,
  { turf: turfId, date, startTime, endTime, sport },
) => {
  if (!mongoose.isValidObjectId(turfId)) throw new Error("Invalid turf.");
  const turf = await turfModel.findOne({
    _id: turfId,
    status: "Active",
    isBlocked: false,
    isListed: true,
    isDeleted: false,
  });
  if (!turf) throw new Error("This turf is not available for booking.");
  const start = minutes(startTime);
  const end = minutes(endTime);
  if (!date || !Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw new Error("Choose a valid booking date and time.");
  if (start < minutes(turf.openingTime) || end > minutes(turf.closingTime))
    throw new Error("The selected slot is outside the turf opening hours.");
  if (
    turf.slots?.length &&
    !turf.slots.some(
      (slot) => slot.startTime === startTime && slot.endTime === endTime,
    )
  )
    throw new Error("This time slot is not available for the turf.");
  const bookingDate = new Date(date);
  if (Number.isNaN(bookingDate.getTime()))
    throw new Error("Choose a valid booking date.");
  bookingDate.setHours(0, 0, 0, 0);
  const conflict = await bookingModel.exists({
    turf: turf._id,
    date: bookingDate,
    status: { $nin: ["cancelled"] },
    $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
  });
  if (conflict) throw new Error("That time slot has already been booked.");
  const selectedSlot = turf.slots?.find(
    (slot) => slot.startTime === startTime && slot.endTime === endTime,
  );
  const amount =
    (selectedSlot?.price ?? turf.pricePerHour) * ((end - start) / 60);
  const owner = await userModel.findById(turf.owner).select("name phone").lean();
  const booking = await bookingModel.create({
    user: userId,
    turf: turf._id,
    date: bookingDate,
    startTime,
    endTime,
    sport: sport || turf.sports[0] || "",
    amount,
    ownerName: owner?.name || "",
    ownerPhone: owner?.phone || turf.contactNumber || "",
    status: "confirmed",
  });
  const user = await userModel.findById(userId).select("name email");
  if (user?.email) {
    transporter
      .sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `Booking confirmed for ${turf.name}`,
        text: `Hi ${user.name || "there"}, your booking at ${turf.name} is confirmed for ${date}, ${startTime} - ${endTime}. Amount: INR ${amount}.`,
      })
      .catch((error) =>
        console.error("Booking confirmation email failed:", error.message),
      );
  }
  return booking;
};

export const getUserBookings = async (userId) => {
  const bookings = await bookingModel
    .find({ user: userId })
    .populate({
      path: "turf",
      select: "name location images primaryImage pricePerHour owner contactNumber",
      populate: { path: "owner", select: "name phone" },
    })
    .sort({ date: -1, startTime: -1 })
    .lean();

  return Promise.all(bookings.map(async (booking) => {
    const turf = booking.turf;
    if (!turf) return booking;
    const ownerId = turf.owner?._id || turf.owner;
    const populatedOwner =
      turf.owner && typeof turf.owner === "object" ? turf.owner : null;
    const owner =
      populatedOwner?.name && populatedOwner?.phone
        ? populatedOwner
        : ownerId
          ? await userModel.findById(ownerId).select("name phone").lean()
          : populatedOwner;
    return {
      ...booking,
      ownerName: booking.ownerName || owner?.name || "",
      ownerPhone: booking.ownerPhone || owner?.phone || turf.contactNumber || "",
      turf: { ...turf, owner: owner || null },
    };
  }));
};
export const cancelUserBooking = async (userId, id, reason) => {
  if (!mongoose.isValidObjectId(id)) throw new Error("Invalid booking.");
  if (!reason?.trim()) throw new Error("Choose a cancellation reason.");
  const booking = await bookingModel.findOne({
    _id: id,
    user: userId,
    status: { $nin: ["cancelled", "completed"] },
  });
  if (!booking) throw new Error("Booking not found or cannot be cancelled.");
  const startAt = new Date(booking.date);
  const [hours, minutesValue] = booking.startTime.split(":").map(Number);
  startAt.setHours(hours, minutesValue, 0, 0);
  if (startAt.getTime() - Date.now() < 4 * 60 * 60 * 1000)
    throw new Error(
      "Bookings can only be cancelled at least 4 hours before the start time.",
    );
  booking.status = "cancelled";
  booking.cancellationReason = reason.trim();
  await booking.save();
  return booking;
};
