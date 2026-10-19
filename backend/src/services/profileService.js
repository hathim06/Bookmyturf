import bcrypt from "bcryptjs";
import userModel from "../models/user.js";
import { sendOtp } from "./otpService.js";
const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  address: user.address || "",
  pincode: user.pincode || "",
  place: user.place || "",
  district: user.district || "",
  role: user.role,
  profilePicture: user.profilePicture,
  googleId: user.googleId,
  hasPassword: Boolean(user.password),
  isBlocked: user.isBlocked,
});
export const getProfile = async (id) => {
  const user = await userModel
    .findById(id)
    .select("-password -passwordResetToken -passwordResetExpires");
  if (!user) throw new Error("User not found.");
  return publicUser(user);
};
export const updateProfile = async (
  id,
  { name, phone, address, pincode, place, district },
) => {
  if (!name || !phone) throw new Error("Name and phone number are required.");
  const user = await userModel
    .findByIdAndUpdate(
      id,
      {
        name,
        phone,
        address: address || "",
        pincode: pincode || "",
        place: place || "",
        district: district || "",
      },
      { new: true, runValidators: true },
    )
    .select("-password -passwordResetToken -passwordResetExpires");
  if (!user) throw new Error("User not found.");
  return publicUser(user);
};
export const updateEmail = async (id, { email, password }) => {
  if (!email || !password)
    throw new Error("New email and current password are required.");
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found.");
  if (!(await bcrypt.compare(password, user.password)))
    throw new Error("Current password is incorrect.");
  if (await userModel.exists({ email, _id: { $ne: id } }))
    throw new Error("That email address is already in use.");
  user.pendingEmail = email;
  await sendOtp(user, "email-change");
};
export const updatePassword = async (id, { currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword)
    throw new Error("Current and new passwords are required.");
  if (newPassword.length < 6)
    throw new Error("New password must be at least 6 characters.");
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found.");
  if (!(await bcrypt.compare(currentPassword, user.password)))
    throw new Error("Current password is incorrect.");
  user.pendingPassword = await bcrypt.hash(newPassword, 10);
  await sendOtp(user, "password-change");
};
export const createPassword = async (id, password) => {
  if (!password || password.length < 6)
    throw new Error("Password must be at least 6 characters.");
  const user = await userModel.findById(id);
  if (!user) throw new Error("User not found.");
  if (user.password) throw new Error("This account already has a password.");
  user.password = await bcrypt.hash(password, 10);
  await user.save();
  return publicUser(user);
};
export const uploadProfilePictureService = async (id, imageUrl) => {
  const user = await userModel
    .findByIdAndUpdate(
      id,
      { profilePicture: imageUrl },
      { new: true, runValidators: true },
    )
    .select("-password -passwordResetToken -passwordResetExpires");
  if (!user) throw new Error("User not found.");
  return publicUser(user);
};
export const removeProfilePictureService = async (id) => {
  const user = await userModel
    .findByIdAndUpdate(
      id,
      { profilePicture: null },
      { new: true, runValidators: true },
    )
    .select("-password -passwordResetToken -passwordResetExpires");
  if (!user) throw new Error("User not found.");
  return publicUser(user);
};
