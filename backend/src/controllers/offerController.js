import offerModel from "../models/offer.js";
import turfModel from "../models/turf.js";
import mongoose from "mongoose";
import { isOfferValidOnDate, utcTodayKey } from "../../utils/offerDates.js";

const isOneValidDate = (from, to) => {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  return Boolean(from && to && !Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime()) &&
    fromDate.toISOString().slice(0, 10) === toDate.toISOString().slice(0, 10));
};

// ──────────────────────────────────────────────
// Owner: Create an offer for one of their turfs
// ──────────────────────────────────────────────
export const createOffer = async (req, res) => {
  try {
    const { turfId, title, description, discountType, discountValue, validFrom, validTo, daysOfWeek } = req.body;

    if (!mongoose.isValidObjectId(turfId))
      return res.status(400).json({ message: "Invalid turf id." });

    // Confirm turf belongs to this owner
    const turf = await turfModel.findOne({ _id: turfId, owner: req.user._id, isDeleted: false });
    if (!turf) return res.status(404).json({ message: "Turf not found." });

    if (!title?.trim()) return res.status(400).json({ message: "Offer title is required." });
    if (!discountValue || Number(discountValue) <= 0)
      return res.status(400).json({ message: "Discount value must be greater than 0." });
    if (discountType === "percentage" && Number(discountValue) > 100)
      return res.status(400).json({ message: "Percentage discount cannot exceed 100." });
    if (!isOneValidDate(validFrom, validTo))
      return res.status(400).json({ message: "Choose one date for this offer." });

    const offer = await offerModel.create({
      turf: turfId,
      owner: req.user._id,
      title: title.trim(),
      description: description?.trim() || "",
      discountType: discountType || "percentage",
      discountValue: Number(discountValue),
      validFrom: validFrom || undefined,
      validTo: validTo || undefined,
      daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek : [],
      isActive: true,
    });

    res.status(201).json({ message: "Offer created successfully.", offer });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────
// Owner: List all offers (across all their turfs)
// ──────────────────────────────────────────────
export const listOwnerOffers = async (req, res) => {
  try {
    const turfs = await turfModel.find({ owner: req.user._id, isDeleted: false }).select("_id");
    const turfIds = turfs.map((t) => t._id);
    const offers = await offerModel
      .find({ turf: { $in: turfIds } })
      .populate("turf", "name location primaryImage images")
      .sort({ createdAt: -1 });
    res.json({ offers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────
// Owner: Get offers for a specific turf
// ──────────────────────────────────────────────
export const listTurfOffers = async (req, res) => {
  try {
    const turf = await turfModel.findOne({ _id: req.params.turfId, owner: req.user._id, isDeleted: false });
    if (!turf) return res.status(404).json({ message: "Turf not found." });
    const offers = await offerModel.find({ turf: req.params.turfId }).sort({ createdAt: -1 });
    res.json({ offers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────
// Owner: Update an offer
// ──────────────────────────────────────────────
export const updateOffer = async (req, res) => {
  try {
    const { title, description, discountType, discountValue, validFrom, validTo, daysOfWeek, isActive } = req.body;

    const offer = await offerModel.findOne({ _id: req.params.id, owner: req.user._id });
    if (!offer) return res.status(404).json({ message: "Offer not found." });

    if (title !== undefined) offer.title = title.trim();
    if (description !== undefined) offer.description = description.trim();
    if (discountType !== undefined) offer.discountType = discountType;
    if (discountValue !== undefined) offer.discountValue = Number(discountValue);
    if (validFrom !== undefined || validTo !== undefined) {
      const nextFrom = validFrom !== undefined ? validFrom : offer.validFrom;
      const nextTo = validTo !== undefined ? validTo : offer.validTo;
      if (!isOneValidDate(nextFrom, nextTo))
        return res.status(400).json({ message: "Choose one date for this offer." });
      offer.validFrom = nextFrom;
      offer.validTo = nextTo;
    }
    if (daysOfWeek !== undefined) offer.daysOfWeek = Array.isArray(daysOfWeek) ? daysOfWeek : [];
    if (isActive !== undefined) offer.isActive = Boolean(isActive);

    await offer.save();
    res.json({ message: "Offer updated.", offer });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────
// Owner: Delete an offer
// ──────────────────────────────────────────────
export const deleteOffer = async (req, res) => {
  try {
    const offer = await offerModel.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!offer) return res.status(404).json({ message: "Offer not found." });
    res.json({ message: "Offer deleted." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────────────────────────
// Public: Get active offers for a turf (user side)
// ──────────────────────────────────────────────
export const getActiveTurfOffers = async (req, res) => {
  try {
    const query = {
      turf: req.params.turfId,
      isActive: true,
    };
    const offers = await offerModel.find(query).lean();
    const requestedDate = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || "")
      ? req.query.date
      : utcTodayKey();
    const filtered = offers.filter((offer) => isOfferValidOnDate(offer, requestedDate));
    res.json({ offers: filtered });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
