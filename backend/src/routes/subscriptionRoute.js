import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { requireOwner } from "../middlewares/roleMiddleware.js";
import { requireAdmin } from "../middlewares/roleMiddleware.js";
import {
  listPlans,
  getMySubscription,
  getMySubscriptionHistory,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  cancelMySubscription,
  getOwnerReport,
  getOwnerDashboard,
  adminListSubscriptions,
  adminSubscriptionStats,
  getAdminReport,
  getAdminDashboard,
} from "../controllers/subscriptionController.js";

const router = express.Router();

// Owner subscription routes
router.get("/plans", protect, listPlans);
router.get("/my", protect, requireOwner, getMySubscription);
router.get("/my/history", protect, requireOwner, getMySubscriptionHistory);
router.post("/create-order", protect, requireOwner, createSubscriptionOrder);
router.post("/verify", protect, requireOwner, verifySubscriptionPayment);
router.patch("/:id/cancel", protect, requireOwner, cancelMySubscription);

// Owner report & dashboard
router.get("/owner/report", protect, requireOwner, getOwnerReport);
router.get("/owner/dashboard", protect, requireOwner, getOwnerDashboard);

// Admin routes
router.get("/admin/all", protect, requireAdmin, adminListSubscriptions);
router.get("/admin/stats", protect, requireAdmin, adminSubscriptionStats);
router.get("/admin/report", protect, requireAdmin, getAdminReport);
router.get("/admin/dashboard", protect, requireAdmin, getAdminDashboard);

export default router;
