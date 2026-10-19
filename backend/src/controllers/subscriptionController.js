import crypto from "crypto";
import Razorpay from "razorpay";
import {
  getOwnerSubscription,
  getOwnerSubscriptionAccess,
  getOwnerSubscriptionHistory,
  createSubscription,
  cancelSubscription,
  getAllSubscriptions,
  getSubscriptionStats,
} from "../services/subscriptionService.js";
import bookingModel from "../models/booking.js";
import turfModel from "../models/turf.js";
import userModel from "../models/user.js";

const PLAN_KEY = "monthly";
const PLAN_AMOUNT = 499; // ₹499/month
const RAZORPAY_KEY_ID = process.env.RAZORPAY_API_KEY;
const RAZORPAY_SECRET = process.env.RAZORPAY_API_SECRET;
const hasRazorpayConfig = Boolean(RAZORPAY_KEY_ID && RAZORPAY_SECRET);

const buildBookingDateFilter = (startDate, endDate) => {
  const dateFilter = {};
  const indiaOffsetMs = 5.5 * 60 * 60 * 1000;
  if (startDate) {
    const [year, month, day] = startDate.split("-").map(Number);
    const start = new Date(Date.UTC(year, month - 1, day) - indiaOffsetMs);
    if (!Number.isNaN(start.getTime())) dateFilter.$gte = start;
  }
  if (endDate) {
    const [year, month, day] = endDate.split("-").map(Number);
    const endExclusive = new Date(Date.UTC(year, month - 1, day + 1) - indiaOffsetMs);
    if (!Number.isNaN(endExclusive.getTime())) dateFilter.$lt = endExclusive;
  }
  return dateFilter;
};

const monthKeyForLocalDate = (value) => {
  const indiaDate = new Date(new Date(value).getTime() + 5.5 * 60 * 60 * 1000);
  return `${indiaDate.getUTCFullYear()}-${String(indiaDate.getUTCMonth() + 1).padStart(2, "0")}`;
};

const razorpay = hasRazorpayConfig
  ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_SECRET })
  : null;

// Owner: Get plan info
export const listPlans = async (req, res) => {
  try {
    res.json({
      monthly: {
        name: "Monthly Plan",
        amount: PLAN_AMOUNT,
        maxTurfs: 10,
        analyticsAccess: true,
        prioritySupport: true,
        customBranding: true,
        description: "Unlock all features. Manage unlimited turfs, access full analytics & priority support.",
        color: "#6366f1",
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Owner: Get current active subscription
export const getMySubscription = async (req, res) => {
  try {
    const subscription = await getOwnerSubscription(req.user._id);
    res.json(subscription || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMySubscriptionAccess = async (req, res) => {
  try {
    res.json(await getOwnerSubscriptionAccess(req.user._id));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Owner: Get subscription history
export const getMySubscriptionHistory = async (req, res) => {
  try {
    const history = await getOwnerSubscriptionHistory(req.user._id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Owner: Create Razorpay order for subscription
export const createSubscriptionOrder = async (req, res) => {
  try {
    if (!hasRazorpayConfig || !razorpay) {
      return res.status(500).json({ success: false, message: "Razorpay keys are not configured." });
    }
    const order = await razorpay.orders.create({
      amount: PLAN_AMOUNT * 100, // paise
      currency: "INR",
      receipt: `sub_${req.user._id}_${Date.now()}`,
      notes: { ownerId: String(req.user._id), plan: PLAN_KEY },
    });
    res.json({ success: true, order, key: RAZORPAY_KEY_ID, amount: PLAN_AMOUNT });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Owner: Verify Razorpay payment and activate subscription
export const verifySubscriptionPayment = async (req, res) => {
  try {
    if (!hasRazorpayConfig) {
      return res.status(500).json({ success: false, message: "Razorpay not configured." });
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment data missing." });
    }
    const expectedSig = crypto
      .createHmac("sha256", RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification failed." });
    }
    const subscription = await createSubscription(
      req.user._id,
      PLAN_KEY,
      razorpay_payment_id,
      razorpay_order_id,
    );
    res.status(201).json({ success: true, message: "Subscription activated!", subscription });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Owner: Cancel subscription
export const cancelMySubscription = async (req, res) => {
  try {
    const subscription = await cancelSubscription(req.params.id, req.user._id);
    res.json({ message: "Subscription cancelled.", subscription });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Owner: Dashboard stats
export const getOwnerDashboard = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const turfs = await turfModel.find({ owner: ownerId, isDeleted: false }).select("_id name averageRating");
    const turfIds = turfs.map((t) => t._id);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allBookings, monthBookings, activeSubscription] = await Promise.all([
      bookingModel.find({ turf: { $in: turfIds } }).populate("user", "name email phone profilePicture").populate("turf", "name").sort({ createdAt: -1 }).limit(10),
      bookingModel.find({ turf: { $in: turfIds }, createdAt: { $gte: monthStart } }),
      getOwnerSubscription(ownerId),
    ]);

    const totalRevenue = allBookings.reduce((s, b) => (b.status !== "cancelled" ? s + b.amount : s), 0);
    const monthRevenue = monthBookings.reduce((s, b) => (b.status !== "cancelled" ? s + b.amount : s), 0);
    const avgRating = turfs.length ? (turfs.reduce((s, t) => s + (t.averageRating || 0), 0) / turfs.length).toFixed(1) : "0";

    // Monthly revenue last 6 months
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const label = d.toLocaleString("default", { month: "short" });
      const rev = allBookings
        .filter((b) => {
          const bd = new Date(b.date);
          return bd >= d && bd <= end && b.status !== "cancelled";
        })
        .reduce((s, b) => s + b.amount, 0);
      monthlyRevenue.push({ label, revenue: rev });
    }

    res.json({
      stats: {
        totalRevenue,
        monthRevenue,
        totalTurfs: turfs.length,
        totalBookings: allBookings.length,
        confirmedBookings: allBookings.filter((b) => ["confirmed", "completed"].includes(b.status)).length,
        avgRating,
      },
      recentBookings: allBookings.slice(0, 5),
      monthlyRevenue,
      activeSubscription,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Owner: Get owner report data (with pagination)
export const getOwnerReport = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { startDate, endDate } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

    const dateFilter = buildBookingDateFilter(startDate, endDate);
    const turfs = await turfModel.find({ owner: ownerId, isDeleted: false }).select("_id name");
    const turfIds = turfs.map((t) => t._id);
    const bookingFilter = { turf: { $in: turfIds } };
    if (Object.keys(dateFilter).length) bookingFilter.date = dateFilter;

    const [allBookings, totalBookings] = await Promise.all([
      bookingModel
        .find(bookingFilter)
        .populate("user", "name email phone")
        .populate("turf", "name location")
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      bookingModel.countDocuments(bookingFilter),
    ]);

    // Summary (all bookings, no pagination)
    const allForSummary = await bookingModel.find(bookingFilter).select("amount status date");
    const totalRevenue = allForSummary.reduce((s, b) => (b.status !== "cancelled" ? s + b.amount : s), 0);
    const confirmed = allForSummary.filter((b) => ["confirmed", "completed"].includes(b.status)).length;
    const cancelled = allForSummary.filter((b) => b.status === "cancelled").length;
    const pending = allForSummary.filter((b) => b.status === "pending").length;

    const monthlyMap = {};
    allForSummary.forEach((b) => {
      if (b.status === "cancelled") return;
      const key = monthKeyForLocalDate(b.date);
      monthlyMap[key] = (monthlyMap[key] || 0) + b.amount;
    });
    const monthly = Object.entries(monthlyMap).map(([month, revenue]) => ({ month, revenue })).sort((a, b) => a.month.localeCompare(b.month));

    const turfMap = {};
    allForSummary.forEach((b) => {
      const turf = turfs.find((t) => String(t._id) === String(b.turf));
      const name = turf?.name || "Unknown";
      if (!turfMap[name]) turfMap[name] = { bookings: 0, revenue: 0 };
      turfMap[name].bookings++;
      if (b.status !== "cancelled") turfMap[name].revenue += b.amount;
    });
    const turfBreakdown = Object.entries(turfMap).map(([name, data]) => ({ name, ...data }));

    res.json({
      summary: { totalBookings, confirmed, cancelled, pending, totalRevenue },
      monthly,
      turfBreakdown,
      bookings: allBookings,
      pagination: { page, limit, total: totalBookings, totalPages: Math.max(1, Math.ceil(totalBookings / limit)) },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Get all subscriptions
export const adminListSubscriptions = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    res.json(await getAllSubscriptions(req.query.search || "", page, limit));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Get subscription stats
export const adminSubscriptionStats = async (req, res) => {
  try {
    res.json(await getSubscriptionStats());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Dashboard stats
export const getAdminDashboard = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalUsers, totalOwners, totalTurfs, allBookings, monthBookings, subStats] = await Promise.all([
      userModel.countDocuments({ role: "user" }),
      userModel.countDocuments({ role: "owner" }),
      turfModel.countDocuments({ isDeleted: false }),
      bookingModel.find().populate("user", "name email").populate("turf", "name location.city").sort({ createdAt: -1 }).limit(10),
      bookingModel.find({ createdAt: { $gte: monthStart } }),
      getSubscriptionStats(),
    ]);

    const totalRevenue = allBookings.reduce((s, b) => (b.status !== "cancelled" ? s + b.amount : s), 0);
    const monthRevenue = monthBookings.reduce((s, b) => (b.status !== "cancelled" ? s + b.amount : s), 0);

    // Monthly revenue last 6 months
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const label = d.toLocaleString("default", { month: "short" });
      const rev = allBookings
        .filter((b) => {
          const bd = new Date(b.date || b.createdAt);
          return bd >= d && bd <= end && b.status !== "cancelled";
        })
        .reduce((s, b) => s + b.amount, 0);
      monthlyRevenue.push({ label, revenue: rev });
    }

    res.json({
      stats: {
        totalRevenue,
        monthRevenue,
        totalUsers,
        totalOwners,
        totalTurfs,
        totalBookings: allBookings.length,
        activeSubscriptions: subStats.activeCount,
        subscriptionRevenue: subStats.totalRevenue,
      },
      recentBookings: allBookings.slice(0, 5),
      monthlyRevenue,
      planBreakdown: subStats.planBreakdown,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Full platform report (with pagination)
export const getAdminReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

    const dateFilter = buildBookingDateFilter(startDate, endDate);
    const bookingFilter = {};
    if (Object.keys(dateFilter).length) bookingFilter.date = dateFilter;

    const [allForSummary, bookings, totalBookings, totalUsers, totalOwners, totalTurfs] = await Promise.all([
      bookingModel.find(bookingFilter).select("amount status date turf"),
      bookingModel.find(bookingFilter).populate("user", "name email phone").populate("turf", "name location").sort({ date: -1 }).skip((page - 1) * limit).limit(limit),
      bookingModel.countDocuments(bookingFilter),
      userModel.countDocuments({ role: "user" }),
      userModel.countDocuments({ role: "owner" }),
      turfModel.countDocuments({ isDeleted: false }),
    ]);

    const totalRevenue = allForSummary.reduce((s, b) => (b.status !== "cancelled" ? s + b.amount : s), 0);
    const confirmed = allForSummary.filter((b) => ["confirmed", "completed"].includes(b.status)).length;
    const cancelled = allForSummary.filter((b) => b.status === "cancelled").length;
    const pending = allForSummary.filter((b) => b.status === "pending").length;

    const monthlyMap = {};
    allForSummary.forEach((b) => {
      if (b.status === "cancelled") return;
      const key = monthKeyForLocalDate(b.date);
      monthlyMap[key] = (monthlyMap[key] || 0) + b.amount;
    });
    const monthly = Object.entries(monthlyMap).map(([month, revenue]) => ({ month, revenue })).sort((a, b) => a.month.localeCompare(b.month));

    const turfMap = {};
    allForSummary.forEach((b) => {
      const name = b.turf?.name || "Unknown";
      if (!turfMap[name]) turfMap[name] = { bookings: 0, revenue: 0 };
      turfMap[name].bookings++;
      if (b.status !== "cancelled") turfMap[name].revenue += b.amount;
    });
    const turfBreakdown = Object.entries(turfMap).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    res.json({
      summary: { totalBookings, confirmed, cancelled, pending, totalRevenue, totalUsers, totalOwners, totalTurfs },
      monthly,
      turfBreakdown,
      bookings,
      pagination: { page, limit, total: totalBookings, totalPages: Math.max(1, Math.ceil(totalBookings / limit)) },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
