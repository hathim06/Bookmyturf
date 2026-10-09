import {
  createOwnerTurf,
  deleteOwnerTurf,
  getOwnerTurfs,
  updateOwnerTurf,
  setOwnerTurfListed,
  getOwnerBookings,
} from "../services/ownerService.js";
export const listTurfs = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1),
      limit = Math.min(50, Math.max(1, Number(req.query.limit) || 5));
    res.json(
      await getOwnerTurfs(req.user._id, req.query.search || "", page, limit),
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const createTurf = async (req, res) => {
  try {
    const turf = await createOwnerTurf(
      {
        ...req.body,
        images:
          req.files?.map((file) => `/uploads/${file.filename}`) ||
          req.body.images,
      },
      req.user._id,
    );
    res.status(201).json({ message: "Turf created successfully", turf });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
export const updateTurf = async (req, res) => {
  try {
    const turf = await updateOwnerTurf(
      req.params.id,
      {
        ...req.body,
        images: req.files?.length
          ? [
              ...(Array.isArray(req.body.images) ? req.body.images : req.body.images ? [req.body.images] : []),
              ...req.files.map((file) => `/uploads/${file.filename}`),
            ]
          : req.body.images,
      },
      req.user._id,
    );
    res.json({ message: "Turf updated successfully", turf });
  } catch (error) {
    res
      .status(error.message === "Turf not found." ? 404 : 400)
      .json({ message: error.message });
  }
};
export const toggleTurfListing = async (req, res) => {
  try {
    const turf = await setOwnerTurfListed(
      req.params.id,
      req.body.isListed,
      req.user._id,
    );
    res.json({
      message: turf.isListed ? "Turf listed." : "Turf unlisted.",
      turf,
    });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};
export const removeTurf = async (req, res) => {
  try {
    await deleteOwnerTurf(req.params.id, req.user._id);
    res.json({ message: "Turf deleted." });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};
export const listOwnerBookings = async (req, res) => {
  try {
    const bookings = await getOwnerBookings(req.user._id);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
