import crypto from "crypto";
import transporter from "../config/email.js";
import userModel from "../models/user.js";
import pendingSignupModel from "../models/pendingSignup.js";

const createOtp = () => crypto.randomInt(100000, 1000000).toString();

const sendEmail = async (email, otp) =>
  transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "BookMyTurf verification code",
    text: `Your BookMyTurf verification code is ${otp}. It expires in 5 minutes.`,
  });

export const sendOtp = async (user, purpose, recipient = user.email) => {
  const otp = createOtp();
  user.otp = otp;
  user.otpPurpose = purpose;
  user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
  await user.save();
  await sendEmail(recipient, otp);
  return user.otpExpires;
};

// Supports both regular signups (password) and Google signups (googleId, no password)
export const createSignupOtp = async ({
  name,
  email,
  password = null,
  phone,
  googleId = null,
}) => {
  const otp = createOtp();
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
  await pendingSignupModel.findOneAndUpdate(
    { email },
    { name, email, password, phone, googleId, otp, otpExpires },
    { upsert: true, new: true, runValidators: false },
  );
  await sendEmail(email, otp);
  return otpExpires;
};

export const resendSignupOtp = async (email) => {
  const pending = await pendingSignupModel.findOne({ email });
  if (!pending) throw new Error("No pending signup was found for this email.");
  pending.otp = createOtp();
  pending.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
  await pending.save();
  await sendEmail(email, pending.otp);
  return pending.otpExpires;
};

export const resendProfileOtp = async (id) => {
  const user = await userModel.findOne({
    _id: id,
    otpPurpose: { $in: ["email-change", "password-change"] },
  });
  if (!user) throw new Error("No pending account change was found.");
  return sendOtp(user, user.otpPurpose);
};

// Creates user from pending record — handles both regular and Google signups
export const verifySignupOtp = async (email, otp) => {
  const pending = await pendingSignupModel.findOne({
    email,
    otp,
    otpExpires: { $gt: new Date() },
  });
  if (!pending) throw new Error("Invalid or expired verification code.");
  if (await userModel.exists({ email }))
    throw new Error("An account already exists for this email.");
  await userModel.create({
    name: pending.name,
    email: pending.email,
    password: pending.password, // null for Google users
    phone: pending.phone,
    googleId: pending.googleId, // set for Google users
    isVerified: true,
  });
  await pending.deleteOne();
};

export const verifyProfileOtp = async (id, otp) => {
  const user = await userModel.findOne({
    _id: id,
    otp,
    otpPurpose: { $in: ["email-change", "password-change"] },
    otpExpires: { $gt: new Date() },
  });
  if (!user) throw new Error("Invalid or expired verification code.");
  if (user.otpPurpose === "email-change") user.email = user.pendingEmail;
  if (user.otpPurpose === "password-change")
    user.password = user.pendingPassword;
  const purpose = user.otpPurpose;
  user.pendingEmail =
    user.pendingPassword =
    user.otp =
    user.otpPurpose =
    user.otpExpires =
      null;
  await user.save();
  return {
    purpose,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  };
};
