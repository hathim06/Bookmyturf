import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import userModel from "../models/user.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

export const googleLogin = async (req, res) => {
  try {
    const { credential, phone } = req.body;

    if (!credential) {
      return res
        .status(400)
        .json({ message: "Google credential is required." });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, email_verified } = payload;

    if (!email_verified) {
      return res
        .status(400)
        .json({ message: "Google account email is not verified." });
    }

    let user = await userModel.findOne({ googleId });

    if (!user) {
      user = await userModel.findOne({ email });
      if (user) {
        user.googleId = googleId;
        if (!user.name) user.name = name;
        await user.save();
      }
    }

    if (user) {
      if (user.isBlocked) {
        return res
          .status(403)
          .json({
            message: "This account has been blocked. Please contact support.",
          });
      }
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" },
      );
      return res.json({
        message: "Logged in successfully.",
        token,
        user: accountData(user),
      });
    }

    const newUser = await userModel.create({
      name,
      email,
      phone: "", // Users can update this later in their profile
      googleId,
      password: null,
      isVerified: true,
    });

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
    return res.status(201).json({
      message: "Account created and logged in successfully.",
      token,
      user: accountData(newUser),
    });
  } catch (error) {
    console.error("Google login error:", error.message);
    res
      .status(400)
      .json({ message: "Google authentication failed. Please try again." });
  }
};
