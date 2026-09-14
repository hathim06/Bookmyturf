import jwt from "jsonwebtoken";
import userModel from "../models/user.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, Please login" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.id).select("-password");
    if (!user) {
      return res
        .status(401)
        .json({ message: "Not authorized, User not found" });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: "This account has been blocked" });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, Please login" });
    }
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Not authorized, insufficient permissions" });
    }
    next();
  };
};
