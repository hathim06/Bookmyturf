import { getPublicTurf, listPublicTurfs } from "../services/turfService.js";

export const listTurfs = async (req, res) => {
  try {
    res.json(await listPublicTurfs(req.query));
  } catch (error) {
    res.status(400).json({ success: false, message: "Unable to load turfs." });
  }
};

export const getTurf = async (req, res) => {
  try {
    res.json({ success: true, data: await getPublicTurf(req.params.id) });
  } catch (error) {
    res
      .status(error.message === "Turf not found." ? 404 : 400)
      .json({ success: false, message: error.message });
  }
};
