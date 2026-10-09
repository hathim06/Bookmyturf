import crypto from "crypto";
import Razorpay from "razorpay";
import {
  cancelUserBooking,
  createBooking,
  getUserBookings,
  getAvailableSlots,
  prepareBookingPaymentRetry,
} from "../services/bookingService.js";
import bookingModel from "../models/booking.js";

const hasRazorpayConfig = Boolean(
  process.env.RAZORPAY_API_KEY && process.env.RAZORPAY_API_SECRET,
);
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET,
});

export const create = async (req, res) => {
  try {
    const booking = await createBooking(req.user._id, {
      ...req.body,
      paymentMethod: req.body.paymentMethod || "cod",
    });
    res.status(201).json({ success: true, booking });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const availability = async (req, res) => {
  try {
    res.json({
      success: true,
      ...(await getAvailableSlots(req.params.id, req.query.date)),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createPaymentOrder = async (req, res) => {
  try {
    if (!hasRazorpayConfig) {
      return res.status(500).json({
        success: false,
        message: "Razorpay keys are missing in the backend configuration.",
      });
    }

    const { turfId, currency = "INR", bookingData } = req.body || {};
    if (
      !turfId ||
      !bookingData?.turf ||
      String(turfId) !== String(bookingData.turf)
    ) {
      return res.status(400).json({
        success: false,
        message: "A matching turf and booking slot are required.",
      });
    }

    const booking = await createBooking(req.user._id, {
      ...bookingData,
      paymentMethod: "razorpay",
      status: "pending",
    });
    let order;
    try {
      order = await razorpay.orders.create({
        amount: Math.round(Number(booking.amount) * 100),
        currency,
        receipt: `booking_${booking._id}_${Date.now()}`,
        notes: {
          turfId,
          userId: String(req.user._id),
          bookingId: String(booking._id),
        },
      });
    } catch (error) {
      await bookingModel.findByIdAndUpdate(booking._id, {
        status: "cancelled",
        paymentStatus: "failed",
        paymentHoldUntil: null,
      });
      throw error;
    }

    booking.razorpayOrderId = order.id;
    await booking.save();
    res.json({ success: true, order, booking });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Unable to create Razorpay order.",
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    if (!hasRazorpayConfig) {
      return res.status(500).json({
        success: false,
        message:
          "Razorpay verification is unavailable because the API keys are missing.",
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingData,
      bookingId,
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Payment data is missing." });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed." });
    }

    const { confirmBookingPayment } =
      await import("../services/bookingService.js");

    let booking;
    if (bookingId) {
      booking = await confirmBookingPayment(bookingId, req.user._id, {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      });
    } else {
      throw new Error(
        "Booking reference is missing. Return to My Bookings to retry payment.",
      );
    }

    res.json({
      success: true,
      booking,
      payment: { razorpay_order_id, razorpay_payment_id, razorpay_signature },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Payment verification failed.",
    });
  }
};

// ──────────────────────────────────────────────────────────────
// Retry Payment: create a new Razorpay order for a pending booking
// ──────────────────────────────────────────────────────────────
export const retryPaymentOrder = async (req, res) => {
  try {
    if (!hasRazorpayConfig) {
      return res.status(500).json({
        success: false,
        message: "Razorpay keys are missing in the backend configuration.",
      });
    }

    const booking = await prepareBookingPaymentRetry(
      req.params.id,
      req.user._id,
    );

    const order = await razorpay.orders.create({
      amount: Math.round(Number(booking.amount) * 100),
      currency: "INR",
      receipt: `retry_${booking._id}_${Date.now()}`,
      notes: {
        bookingId: String(booking._id),
        userId: String(req.user._id),
      },
    });
    booking.razorpayOrderId = order.id;
    await booking.save();

    res.json({ success: true, order, booking });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Unable to create retry payment order.",
    });
  }
};

export const listMine = async (req, res) => {
  try {
    res.json({ success: true, bookings: await getUserBookings(req.user._id) });
  } catch {
    res
      .status(500)
      .json({ success: false, message: "Unable to load bookings." });
  }
};

export const cancel = async (req, res) => {
  try {
    res.json({
      success: true,
      booking: await cancelUserBooking(
        req.user._id,
        req.params.id,
        req.body?.reason,
      ),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
