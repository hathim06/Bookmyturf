import {
  resendProfileOtp,
  verifyProfileOtp,
  verifySignupOtp,
} from "../services/otpService.js";

export const verifySignup = async (req, res) => {
  try {
    await verifySignupOtp(req.body.email, req.body.otp);
    res.json({ message: "Email verified. You can now log in." });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const verifyProfileChange = async (req, res) => {
  try {
    const result = await verifyProfileOtp(req.user._id, req.body.otp);
    res.json({
      message:
        result.purpose === "email-change"
          ? "Email address updated."
          : "Password updated successfully.",
      user: result.user,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const resendProfile = async (req, res) => {
  try {
    await resendProfileOtp(req.user._id);
    res.json({ message: "A new OTP has been sent." });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
