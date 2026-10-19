import { getWallet } from "../services/walletService.js";

export const readWallet = async (req, res) => {
  try {
    res.json(await getWallet(req.user._id));
  } catch (error) {
    res.status(500).json({ message: error.message || "Unable to load wallet." });
  }
};
