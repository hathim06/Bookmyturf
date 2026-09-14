import crypto from "crypto";
import Razorpay from "razorpay";
import {
  cancelUserBooking,
  createBooking,
  getUserBookings,
} from "../services/bookingService.js";

const hasRazorpayConfig = Boolean(
  process.env.RAZORPAY_API_KEY && process.env.RAZORPAY_API_SECRET,
);
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET,
});

export const create = async (req, res) => {
  try {
    res
      .status(201)
      .json({
        success: true,
        booking: await createBooking(req.user._id, req.body),
      });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createPaymentOrder = async (req, res) => {
  try {
    if (!hasRazorpayConfig) {
      return res
        .status(500)
        .json({
          success: false,
          message: "Razorpay keys are missing in the backend configuration.",
        });
    }

    const { turfId, amount, currency = "INR", bookingData } = req.body || {};
    if (!turfId || !amount || Number(amount) <= 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "A valid turf and total amount are required.",
        });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100),
      currency,
      receipt: `booking_${Date.now()}`,
      notes: {
        turfId,
        userId: String(req.user._id),
        bookingData: JSON.stringify(bookingData || {}),
      },
    });

    res.json({ success: true, order });
  } catch (error) {
    res
      .status(400)
      .json({
        success: false,
        message: error.message || "Unable to create Razorpay order.",
      });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    if (!hasRazorpayConfig) {
      return res
        .status(500)
        .json({
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

    const booking = await createBooking(req.user._id, bookingData || {});

    res.json({
      success: true,
      booking,
      payment: {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      },
    });
  } catch (error) {
    res
      .status(400)
      .json({
        success: false,
        message: error.message || "Payment verification failed.",
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
