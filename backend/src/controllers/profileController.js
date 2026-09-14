import {
  createPassword,
  getProfile,
  updateEmail,
  updatePassword,
  updateProfile,
  uploadProfilePictureService,
  removeProfilePictureService,
} from "../services/profileService.js";
export const readProfile = async (req, res) => {
  try {
    res.json({ user: await getProfile(req.user._id) });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};
export const editProfile = async (req, res) => {
  try {
    res.json({
      message: "Profile updated.",
      user: await updateProfile(req.user._id, req.body),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
export const changeEmail = async (req, res) => {
  try {
    await updateEmail(req.user._id, req.body);
    res.json({
      message: "OTP sent to your current email address.",
      requiresOtp: true,
      purpose: "email-change",
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
export const changePassword = async (req, res) => {
  try {
    await updatePassword(req.user._id, req.body);
    res.json({
      message: "OTP sent to your current email address.",
      requiresOtp: true,
      purpose: "password-change",
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
export const setPassword = async (req, res) => {
  try {
    res.json({
      message: "Password created successfully.",
      user: await createPassword(req.user._id, req.body.password),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
export const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an image file." });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    const user = await uploadProfilePictureService(req.user._id, imageUrl);
    res.json({ message: "Profile picture updated successfully.", user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
export const removeProfilePicture = async (req, res) => {
  try {
    const user = await removeProfilePictureService(req.user._id);
    res.json({ message: "Profile picture removed successfully.", user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
