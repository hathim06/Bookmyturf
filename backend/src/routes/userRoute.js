import express from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  resendSignup,
  verifyPasswordResetOtp,
} from "../controllers/authController.js";
import {
  verifySignup,
  verifyProfileChange,
  resendProfile,
} from "../controllers/otpController.js";
import {
  readProfile,
  editProfile,
  changeEmail,
  changePassword,
  setPassword,
  uploadProfilePicture,
  removeProfilePicture,
} from "../controllers/profileController.js";
import { protect } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import { googleLogin } from "../controllers/googleAuthController.js";
import {
  cancel,
  create,
  createPaymentOrder,
  listMine,
  verifyPayment,
  retryPaymentOrder,
} from "../controllers/bookingController.js";
import { getActiveTurfOffers } from "../controllers/offerController.js";
import { readWallet } from "../controllers/walletController.js";

const router = express.Router();

// Auth routes
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-password-reset-otp", verifyPasswordResetOtp);
router.post("/reset-password", resetPassword);

// Google OAuth
router.post("/google-login", googleLogin);

// OTP routes
router.post("/verify-signup-otp", verifySignup);
router.post("/verify-otp", verifySignup);
router.post("/resend-signup-otp", resendSignup);
router.post("/resend-otp", resendSignup);

// Profile routes (protected)
router.get("/profile", protect, readProfile);
router.patch("/profile", protect, editProfile);
router.post(
  "/profile/picture",
  protect,
  upload.single("profilePicture"),
  uploadProfilePicture,
);
router.delete("/profile/picture", protect, removeProfilePicture);
router.patch("/profile/email", protect, changeEmail);
router.patch("/profile/password", protect, changePassword);
router.post("/profile/password/create", protect, setPassword);
router.post("/profile/verify-otp", protect, verifyProfileChange);
router.post("/profile/resend-otp", protect, resendProfile);

// Booking routes
router.get("/bookings", protect, listMine);
router.post("/bookings", protect, create);
router.patch("/bookings/:id/cancel", protect, cancel);
router.post("/bookings/:id/retry-payment", protect, retryPaymentOrder);
router.get("/wallet", protect, readWallet);

// Payment routes
router.post("/create-order", protect, createPaymentOrder);
router.post("/verify", protect, verifyPayment);
router.post("/payments/create-order", protect, createPaymentOrder);
router.post("/payment/create-order", protect, createPaymentOrder);
router.post("/payments/verify", protect, verifyPayment);
router.post("/payment/verify", protect, verifyPayment);

export default router;
