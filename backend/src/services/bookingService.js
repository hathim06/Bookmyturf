import mongoose from "mongoose";
import bookingModel from "../models/booking.js";
import turfModel from "../models/turf.js";
import userModel from "../models/user.js";
import transporter from "../config/email.js";
import { createNotification } from "./notificationService.js";
import offerModel from "../models/offer.js";
import { isOfferValidOnDate } from "../../utils/offerDates.js";
import { creditBookingRefund } from "./walletService.js";

const PAYMENT_RETRY_WINDOW_MS = 4 * 60 * 60 * 1000;
const PAYMENT_HOLD_MS = 10 * 60 * 1000;

const minutes = (time) => {
  const [hours, mins] = String(time || "")
    .split(":")
    .map(Number);
  return Number.isFinite(hours) && Number.isFinite(mins)
    ? hours * 60 + mins
    : NaN;
};

const getOfferForDate = async (turfId, selectedDate, basePrice = 0) => {
  const offers = await offerModel.find({ turf: turfId, isActive: true }).lean();
  const dateKey = String(selectedDate || "").slice(0, 10);
  return offers
    .filter((offer) => isOfferValidOnDate(offer, dateKey))
    .sort((a, b) => priceWithOffer(basePrice, a) - priceWithOffer(basePrice, b))[0] || null;
};

const priceWithOffer = (price, offer) => {
  if (!offer) return price;
  const discount = offer.discountType === "percentage"
    ? price * offer.discountValue / 100
    : offer.discountValue;
  return Math.max(0, Math.round(price - discount));
};

export const createBooking = async (
  userId,
  { turf: turfId, date, startTime, endTime, sport, status = "confirmed", paymentMethod = "cod", razorpayOrderId = "", razorpayPaymentId = "" },
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
  const bookingDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(bookingDate.getTime()))
    throw new Error("Choose a valid booking date.");
  bookingDate.setHours(0, 0, 0, 0);
  if (bookingDate < new Date(new Date().setHours(0, 0, 0, 0)))
    throw new Error("Bookings cannot be made for a past date.");
  const startAt = new Date(bookingDate);
  startAt.setHours(Math.floor(start / 60), start % 60, 0, 0);
  if (startAt <= new Date())
    throw new Error("This time slot has already started or ended.");
  const now = new Date();
  const conflict = await bookingModel.exists({
    turf: turf._id,
    date: bookingDate,
    $and: [
      { $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }] },
      { $or: [
        { status: { $in: ["confirmed", "completed"] } },
        { status: "pending", paymentMethod: "razorpay", paymentHoldUntil: { $gt: now } },
      ] },
    ],
  });
  if (conflict) throw new Error("That time slot has already been booked.");
  const selectedSlot = turf.slots?.find(
    (slot) => slot.startTime === startTime && slot.endTime === endTime,
  );
  const basePrice = selectedSlot?.price ?? turf.pricePerHour;
  const offer = await getOfferForDate(turf._id, date, basePrice);
  const hourlyPrice = offer ? priceWithOffer(basePrice, offer) : basePrice;
  const amount = hourlyPrice * ((end - start) / 60);
  const owner = await userModel.findById(turf.owner).select("name phone").lean();
  const paymentStatus = (paymentMethod === "razorpay" && status === "confirmed") ? "paid" : (status === "confirmed" ? "paid" : "pending");
  const isPendingPayment = status === "pending" && paymentMethod === "razorpay";
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
    status,
    paymentMethod,
    paymentStatus,
    razorpayOrderId: razorpayOrderId || "",
    razorpayPaymentId: razorpayPaymentId || "",
    ...(isPendingPayment ? {
      paymentRetryUntil: new Date(now.getTime() + PAYMENT_RETRY_WINDOW_MS),
      paymentHoldUntil: new Date(now.getTime() + PAYMENT_HOLD_MS),
    } : {}),
  });
  const user = await userModel.findById(userId).select("name email");
  if (status === "confirmed") {
  await Promise.all([
    createNotification({ recipient: userId, type: "booking", title: "Booking confirmed", message: `${turf.name} is booked for ${date}, ${startTime} - ${endTime}.`, link: "/bookings" }),
    createNotification({ recipient: turf.owner, type: "booking", title: "New turf booking", message: `${user?.name || "A customer"} booked ${turf.name} for ${date}, ${startTime} - ${endTime}.`, link: "/owner/bookings" }),
  ]);
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
  }
  return booking;
};
export const confirmBookingPayment = async (bookingId, userId, { razorpayOrderId = "", razorpayPaymentId = "" } = {}) => {
  const pending = await bookingModel.findOne({ _id: bookingId, user: userId, status: "pending", paymentMethod: "razorpay" });
  if (!pending) throw new Error("Pending booking was not found.");
  if (razorpayOrderId && pending.razorpayOrderId && pending.razorpayOrderId !== razorpayOrderId) {
    throw new Error("Payment order does not match this booking.");
  }
  const retryUntil = pending.paymentRetryUntil || new Date(pending.createdAt.getTime() + PAYMENT_RETRY_WINDOW_MS);
  if (retryUntil <= new Date()) throw new Error("The payment retry window has expired.");
  const [hours, minutesValue] = pending.startTime.split(":").map(Number);
  const slotStart = new Date(pending.date);
  slotStart.setHours(hours, minutesValue, 0, 0);
  if (slotStart <= new Date()) throw new Error("This booking slot has already started.");

  const conflict = await bookingModel.exists({
    _id: { $ne: pending._id },
    turf: pending.turf,
    date: pending.date,
    $and: [
      { $or: [{ startTime: { $lt: pending.endTime }, endTime: { $gt: pending.startTime } }] },
      { $or: [
        { status: { $in: ["confirmed", "completed"] } },
        { status: "pending", paymentMethod: "razorpay", paymentHoldUntil: { $gt: new Date() } },
      ] },
    ],
  });
  if (conflict) throw new Error("This slot has been booked by another player. Payment could not be confirmed.");

  const booking = await bookingModel.findOneAndUpdate(
    { _id: bookingId, user: userId, status: "pending", paymentMethod: "razorpay" },
    {
      status: "confirmed",
      paymentStatus: "paid",
      paymentHoldUntil: null,
      ...(razorpayOrderId ? { razorpayOrderId } : {}),
      ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
    },
    { new: true },
  );
  if (booking) {
    const turf = await turfModel.findById(booking.turf);
    const user = await userModel.findById(userId).select("name email");
    await Promise.all([
      createNotification({ recipient: userId, type: "booking", title: "Booking confirmed", message: `${turf.name} is booked for ${booking.date}, ${booking.startTime} - ${booking.endTime}.`, link: "/bookings" }),
      createNotification({ recipient: turf.owner, type: "booking", title: "New turf booking", message: `${user?.name || "A customer"} booked ${turf.name} for ${booking.date}, ${booking.startTime} - ${booking.endTime}.`, link: "/owner/bookings" }),
    ]);
  }
  return booking;
};


export const getAvailableSlots = async (turfId, date) => {
  if (!mongoose.isValidObjectId(turfId)) throw new Error("Invalid turf id.");
  const turf = await turfModel.findOne({ _id: turfId, status: "Active", isBlocked: false, isListed: true, isDeleted: false }).lean();
  if (!turf) throw new Error("Turf not found.");
  const bookingDate = new Date(`${date}T00:00:00`);
  if (!date || Number.isNaN(bookingDate.getTime())) throw new Error("Choose a valid booking date.");
  bookingDate.setHours(0, 0, 0, 0);
  const now = new Date();
  const booked = await bookingModel.find({
    turf: turf._id,
    date: bookingDate,
    $or: [
      { status: { $in: ["confirmed", "completed"] } },
      { status: "pending", paymentMethod: "razorpay", paymentHoldUntil: { $gt: now } },
    ],
  }).select("startTime endTime").lean();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const slots = await Promise.all((turf.slots || []).map(async (slot) => {
    const slotStart = new Date(bookingDate);
    const [hours, mins] = slot.startTime.split(":").map(Number);
    slotStart.setHours(hours, mins, 0, 0);
    const isBooked = booked.some((booking) => booking.startTime < slot.endTime && booking.endTime > slot.startTime);
    const originalPrice = slot.price ?? turf.pricePerHour;
    const offer = await getOfferForDate(turf._id, date, originalPrice);
    const price = offer ? priceWithOffer(originalPrice, offer) : originalPrice;
    return { ...slot, price, originalPrice, offerTitle: offer?.title || "", available: bookingDate >= todayStart && slotStart > now && !isBooked };
  }));
  return { slots };
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
    const [bookingHours, bookingMinutes] = booking.startTime.split(":").map(Number);
    const bookingStartAt = new Date(booking.date);
    bookingStartAt.setHours(bookingHours, bookingMinutes, 0, 0);
    const canCancel = booking.status === "confirmed" &&
      bookingStartAt.getTime() - Date.now() >= 4 * 60 * 60 * 1000;
    let canRetryPayment = false;
    let paymentRetryUntil = booking.paymentRetryUntil || null;
    if (booking.status === "pending" && booking.paymentMethod === "razorpay") {
      const retryUntil = paymentRetryUntil
        ? new Date(paymentRetryUntil)
        : new Date(new Date(booking.createdAt).getTime() + PAYMENT_RETRY_WINDOW_MS);
      const [hours, minutesValue] = booking.startTime.split(":").map(Number);
      const slotStart = new Date(booking.date);
      slotStart.setHours(hours, minutesValue, 0, 0);
      const conflict = await bookingModel.exists({
        _id: { $ne: booking._id },
        turf: booking.turf._id,
        date: booking.date,
        $and: [
          { $or: [{ startTime: { $lt: booking.endTime }, endTime: { $gt: booking.startTime } }] },
          { $or: [
            { status: { $in: ["confirmed", "completed"] } },
            { status: "pending", paymentMethod: "razorpay", paymentHoldUntil: { $gt: new Date() } },
          ] },
        ],
      });
      paymentRetryUntil = retryUntil;
      canRetryPayment = retryUntil > new Date() && slotStart > new Date() && !conflict;
    }
    return {
      ...booking,
      canCancel,
      canRetryPayment,
      paymentRetryUntil,
      ownerName: booking.ownerName || owner?.name || "",
      ownerPhone: booking.ownerPhone || owner?.phone || turf.contactNumber || "",
      turf: { ...turf, owner: owner || null },
    };
  }));
};

export const prepareBookingPaymentRetry = async (bookingId, userId) => {
  const booking = await bookingModel.findOne({
    _id: bookingId,
    user: userId,
    status: "pending",
    paymentMethod: "razorpay",
  }).populate("turf", "name");
  if (!booking) throw new Error("This booking is no longer available for payment retry.");

  const now = new Date();
  const retryUntil = booking.paymentRetryUntil || new Date(booking.createdAt.getTime() + PAYMENT_RETRY_WINDOW_MS);
  const [hours, minutesValue] = booking.startTime.split(":").map(Number);
  const slotStart = new Date(booking.date);
  slotStart.setHours(hours, minutesValue, 0, 0);
  if (retryUntil <= now || slotStart <= now) {
    throw new Error("The payment retry window has expired.");
  }

  const conflict = await bookingModel.exists({
    _id: { $ne: booking._id },
    turf: booking.turf._id,
    date: booking.date,
    $and: [
      { $or: [{ startTime: { $lt: booking.endTime }, endTime: { $gt: booking.startTime } }] },
      { $or: [
        { status: { $in: ["confirmed", "completed"] } },
        { status: "pending", paymentMethod: "razorpay", paymentHoldUntil: { $gt: now } },
      ] },
    ],
  });
  if (conflict) throw new Error("This slot has been booked by another player. Payment retry is unavailable.");

  booking.paymentRetryUntil = retryUntil;
  booking.paymentHoldUntil = new Date(now.getTime() + PAYMENT_HOLD_MS);
  await booking.save();
  return booking;
};
export const cancelUserBooking = async (userId, id, reason) => {
  if (!mongoose.isValidObjectId(id)) throw new Error("Invalid booking.");
  let booking = await bookingModel.findOne({ _id: id, user: userId });
  if (!booking) throw new Error("Booking not found or cannot be cancelled.");

  if (booking.status !== "cancelled") {
    if (!reason?.trim()) throw new Error("Choose a cancellation reason.");
    if (!["confirmed", "pending"].includes(booking.status))
      throw new Error("Booking not found or cannot be cancelled.");

    const startAt = new Date(booking.date);
    const [hours, minutesValue] = booking.startTime.split(":").map(Number);
    startAt.setHours(hours, minutesValue, 0, 0);
    if (startAt.getTime() - Date.now() < 4 * 60 * 60 * 1000)
      throw new Error(
        "Bookings can only be cancelled at least 4 hours before the start time.",
      );

    booking = await bookingModel.findOneAndUpdate(
      { _id: id, user: userId, status: booking.status },
      { status: "cancelled", cancellationReason: reason.trim() },
      { new: true },
    );
    if (!booking) throw new Error("Booking changed while being cancelled. Please retry.");
  }

  // Only captured Razorpay payments are refundable; COD bookings were not paid online.
  if (
    booking.paymentMethod === "razorpay" &&
    booking.paymentStatus === "paid" &&
    booking.amount > 0 &&
    booking.refundStatus !== "credited"
  ) {
    await creditBookingRefund(userId, booking);
    booking.refundStatus = "credited";
    booking.refundAmount = booking.amount;
    await booking.save();
  }

  return booking;
};
