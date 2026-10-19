import {
  createPasswordReset,
  loginAccount,
  registerAccount,
  resetPassword as resetPasswordService,
  verifyPasswordResetOtp as verifyOtpService,
} from "../services/authService.js";
import { resendSignupOtp } from "../services/otpService.js";
const required = ({ name, email, password, phone }) =>
  name && email && password && phone;
export const register = async (req, res) => {
  try {
    if (!required(req.body))
      return res.status(400).json({ message: "Please fill all the fields" });
    const result = await registerAccount(req.body);
    res
      .status(201)
      .json({ message: "OTP sent to your email address.", ...result });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
export const resendSignup = async (req, res) => {
  try {
    res.json({
      message: "A new OTP has been sent.",
      expiresAt: await resendSignupOtp(req.body.email),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
export const login = async (req, res) => {
  try {
    if (!req.body.email || !req.body.password)
      return res.status(400).json({ message: "Please fill all the fields" });
    res.json({
      message: "User logged in successfully",
      ...(await loginAccount(req.body)),
    });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};
export const forgotPassword = async (req, res) => {
  try {
    if (!req.body.email)
      return res.status(400).json({ message: "Enter your email address." });
    await createPasswordReset(req.body.email);
    res.json({
      message: "If an account exists for that email, an OTP has been sent.",
    });
  } catch (error) {
    console.error("Password reset email could not be sent:", error.message);
    res.status(500).json({
      message: "Could not send the reset code. Please try again later or contact support.",
    });
  }
};
export const verifyPasswordResetOtp = async (req, res) => {
  try {
    await verifyOtpService(req.body.email, req.body.otp);
    res.json({ message: "OTP verified successfully." });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
export const resetPassword = async (req, res) => {
  try {
    await resetPasswordService(req.body.email, req.body.otp, req.body.password);
    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
