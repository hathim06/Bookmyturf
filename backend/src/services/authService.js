import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import userModel from "../models/user.js";
import { createSignupOtp, sendOtp } from "./otpService.js";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const accountData = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  googleId: user.googleId,
  hasPassword: Boolean(user.password),
  isBlocked: user.isBlocked,
});
export const registerAccount = async ({
  name,
  email,
  password,
  phone,
  role = "user",
}) => {
  if (await userModel.findOne({ email }))
    throw new Error("User already exists");
  if (role !== "user") {
    const user = await userModel.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      phone,
      role,
      isVerified: true,
    });
    return { user: accountData(user) };
  }
  const expiresAt = await createSignupOtp({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    phone,
  });
  return { expiresAt };
};
export const loginAccount = async ({ email, password }) => {
  const user = await userModel.findOne({ email: normalizeEmail(email) });
  if (!user) throw new Error("User not found");
  if (!user.isVerified)
    throw new Error(
      "Please verify your email with the OTP sent during signup.",
    );
  if (user.isBlocked)
    throw new Error("This account has been blocked. Please contact support.");
  if (!user.password)
    throw new Error(
      "This account has no password set. Use Google sign-in or choose Forgot password to add one.",
    );
  if (!(await bcrypt.compare(password, user.password)))
    throw new Error("Invalid password");
  return {
    token: jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    }),
    user: accountData(user),
  };
};
export const createPasswordReset = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await userModel.findOne({ email: normalizedEmail });
  if (user) {
    // A password reset adds a password without removing the linked Google account.
    await sendOtp(user, "password-reset");
  }
  return true;
};
export const verifyPasswordResetOtp = async (email, otp) => {
  const user = await userModel.findOne({
    email: normalizeEmail(email),
    otp: String(otp || "").trim(),
    otpPurpose: "password-reset",
    otpExpires: { $gt: new Date() },
  });
  if (!user) throw new Error("This OTP is invalid or has expired.");
  return true;
};
export const resetPassword = async (email, otp, password) => {
  if (!password || password.length < 6)
    throw new Error("Password must be at least 6 characters.");
  const user = await userModel.findOne({
    email: normalizeEmail(email),
    otp: String(otp || "").trim(),
    otpPurpose: "password-reset",
    otpExpires: { $gt: new Date() },
  });
  if (!user) throw new Error("This OTP is invalid or has expired.");
  user.password = await bcrypt.hash(password, 10);
  user.otp = null;
  user.otpPurpose = null;
  user.otpExpires = null;
  await user.save();
};
