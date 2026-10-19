import { getOwnerSubscriptionAccess } from "../services/subscriptionService.js";

export const requireOwnerSubscription = async (req, res, next) => {
  try {
    const access = await getOwnerSubscriptionAccess(req.user._id);
    if (!access.canCreate) {
      return res.status(403).json({
        code: "SUBSCRIPTION_REQUIRED",
        message: "Subscribe to create turfs, offers, and categories.",
        access,
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to verify subscription." });
  }
};
