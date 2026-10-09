import subscriptionModel from "../models/subscription.js";
import userModel from "../models/user.js";

export const PLANS = {
  monthly: {
    name: "Monthly Plan",
    amount: 499,
    maxTurfs: 10,
    analyticsAccess: true,
    prioritySupport: true,
    customBranding: true,
    description: "Unlock all features. Manage unlimited turfs, access full analytics & priority support.",
    color: "#6366f1",
  },
};

export const getPlans = () => PLANS;

export const getOwnerSubscription = async (ownerId) => {
  const now = new Date();
  const subscription = await subscriptionModel
    .findOne({ owner: ownerId, status: "active", endDate: { $gt: now } })
    .sort({ createdAt: -1 });
  return subscription;
};

export const getOwnerSubscriptionHistory = async (ownerId) => {
  return subscriptionModel
    .find({ owner: ownerId })
    .sort({ createdAt: -1 })
    .limit(20);
};

export const createSubscription = async (ownerId, plan, paymentId = null, orderId = null) => {
  if (!PLANS[plan]) throw new Error("Invalid plan selected.");
  const planData = PLANS[plan];

  // Expire any existing active subscriptions
  await subscriptionModel.updateMany(
    { owner: ownerId, status: "active" },
    { status: "expired" }
  );

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  const subscription = await subscriptionModel.create({
    owner: ownerId,
    plan,
    status: "active",
    startDate,
    endDate,
    amount: planData.amount,
    paymentId,
    orderId,
    features: {
      maxTurfs: planData.maxTurfs,
      analyticsAccess: planData.analyticsAccess,
      prioritySupport: planData.prioritySupport,
      customBranding: planData.customBranding,
    },
  });

  return subscription;
};

export const cancelSubscription = async (subscriptionId, ownerId) => {
  const subscription = await subscriptionModel.findOneAndUpdate(
    { _id: subscriptionId, owner: ownerId, status: "active" },
    { status: "cancelled" },
    { new: true }
  );
  if (!subscription) throw new Error("Active subscription not found.");
  return subscription;
};

// Admin: get all subscriptions with owner details
export const getAllSubscriptions = async (search = "", page = 1, limit = 10) => {
  const owners = await userModel.find({
    role: "owner",
    $or: [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ],
  }).select("_id");
  const ownerIds = owners.map((o) => o._id);
  const filter = search ? { owner: { $in: ownerIds } } : {};
  const [subscriptions, total] = await Promise.all([
    subscriptionModel
      .find(filter)
      .populate("owner", "name email phone")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    subscriptionModel.countDocuments(filter),
  ]);
  return { subscriptions, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
};

export const getSubscriptionStats = async () => {
  const now = new Date();
  const [activeCount, totalRevenue, planBreakdown, recentSubs] = await Promise.all([
    subscriptionModel.countDocuments({ status: "active", endDate: { $gt: now } }),
    subscriptionModel.aggregate([
      { $match: { status: { $in: ["active", "expired"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    subscriptionModel.aggregate([
      { $match: { status: "active", endDate: { $gt: now } } },
      { $group: { _id: "$plan", count: { $sum: 1 }, revenue: { $sum: "$amount" } } },
    ]),
    subscriptionModel
      .find()
      .populate("owner", "name email")
      .sort({ createdAt: -1 })
      .limit(5),
  ]);
  return {
    activeCount,
    totalRevenue: totalRevenue[0]?.total || 0,
    planBreakdown,
    recentSubs,
  };
};
