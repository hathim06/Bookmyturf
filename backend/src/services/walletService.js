import userModel from "../models/user.js";

export const getWallet = async (userId) => {
  const user = await userModel
    .findById(userId)
    .select("walletBalance walletTransactions")
    .lean();
  if (!user) throw new Error("User not found.");

  return {
    balance: user.walletBalance || 0,
    transactions: (user.walletTransactions || []).slice().sort(
      (first, second) => new Date(second.createdAt) - new Date(first.createdAt),
    ),
  };
};

// Credit a particular booking refund once, even if cancellation is retried.
export const creditBookingRefund = async (userId, booking) => {
  const amount = Number(booking.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("The booking has no refundable amount.");
  }

  const walletUser = await userModel.findOneAndUpdate(
    {
      _id: userId,
      walletTransactions: {
        $not: {
          $elemMatch: { booking: booking._id, reason: "booking_refund" },
        },
      },
    },
    {
      $inc: { walletBalance: amount },
      $push: {
        walletTransactions: {
          type: "credit",
          amount,
          reason: "booking_refund",
          description: `Refund for cancelled turf booking`,
          booking: booking._id,
          createdAt: new Date(),
        },
      },
    },
    { new: true, runValidators: true },
  ).select("walletBalance");

  if (!walletUser) {
    const alreadyCredited = await userModel.exists({
      _id: userId,
      walletTransactions: {
        $elemMatch: { booking: booking._id, reason: "booking_refund" },
      },
    });
    if (!alreadyCredited) throw new Error("Unable to credit the wallet refund.");
    return { balance: null, alreadyCredited: true };
  }

  return { balance: walletUser.walletBalance, alreadyCredited: false };
};
