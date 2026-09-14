import { registerAccount } from "../services/authService.js";
import {
  deactivateManagedTurf,
  deleteManagedUser,
  getManagedBookings,
  getManagedUserDetails,
  getManagedTurfs,
  getManagedUsers,
  setManagedTurfListed,
  setManagedTurfStatus,
  setUserBlocked,
} from "../services/adminService.js";
const required = ({ name, email, password, phone }) =>
  name && email && password && phone;
export const createOwner = async (req, res) => {
  try {
    if (!required(req.body))
      return res.status(400).json({ message: "Please fill all the fields" });
    const user = await registerAccount({ ...req.body, role: "owner" });
    res.status(201).json({ message: "Owner created successfully", user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
export const listUsers = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1),
      limit = Math.min(50, Math.max(1, Number(req.query.limit) || 5));
    res.json(
      await getManagedUsers(
        req.query.role,
        req.query.search || "",
        page,
        limit,
      ),
    );
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
export const listBookings = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1),
      limit = Math.min(50, Math.max(1, Number(req.query.limit) || 5));
    res.json(await getManagedBookings(req.query.search || "", page, limit));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
export const getUserDetails = async (req, res) => {
  try {
    res.json(await getManagedUserDetails(req.params.id));
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};
export const blockUser = async (req, res) => {
  try {
    const user = await setUserBlocked(req.params.id, req.body.isBlocked);
    res.json({
      message: user.isBlocked ? "Account blocked." : "Account unblocked.",
      user,
    });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};
export const removeUser = async (req, res) => {
  try {
    await deleteManagedUser(req.params.id);
    res.json({ message: "Account deleted." });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};
export const listTurfs = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    res.json(await getManagedTurfs(req.query.search || "", page));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
export const toggleTurfListing = async (req, res) => {
  try {
    const turf = await setManagedTurfListed(req.params.id, req.body.isListed);
    res.json({
      message: turf.isListed ? "Turf listed." : "Turf unlisted.",
      turf,
    });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};
export const updateTurfStatus = async (req, res) => {
  try {
    const turf = await setManagedTurfStatus(req.params.id, req.body.status);
    res.json({ message: "Turf status updated.", turf });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
export const deactivateTurf = async (req, res) => {
  try {
    const turf = await deactivateManagedTurf(req.params.id);
    res.json({ message: "Turf deactivated.", turf });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};
