import express from "express";
import {
  createTurf,
  listTurfs,
  removeTurf,
  updateTurf,
  toggleTurfListing,
  listOwnerBookings,
} from "../controllers/ownerController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireOwner } from "../middlewares/roleMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import { requireOwnerSubscription } from "../middlewares/subscriptionMiddleware.js";
import {
  createCategory,
  deleteCategory,
  listCategories,
} from "../controllers/categoryController.js";
import {
  createOffer,
  listOwnerOffers,
  listTurfOffers,
  updateOffer,
  deleteOffer,
} from "../controllers/offerController.js";

const router = express.Router();
router.use(protect, requireOwner);

// Turfs
router.get("/turfs", listTurfs);
router.post("/turfs", requireOwnerSubscription, upload.array("images", 8), createTurf);
router.put("/turfs/:id", upload.array("images", 8), updateTurf);
router.patch("/turfs/:id/listing", toggleTurfListing);
router.delete("/turfs/:id", removeTurf);

// Bookings
router.get("/bookings", listOwnerBookings);

// Categories
router.get("/categories", listCategories);
router.post("/categories", requireOwnerSubscription, createCategory);
router.delete("/categories/:id", deleteCategory);

// Offers
router.get("/offers", listOwnerOffers);
router.get("/turfs/:turfId/offers", listTurfOffers);
router.post("/offers", requireOwnerSubscription, createOffer);
router.put("/offers/:id", updateOffer);
router.delete("/offers/:id", deleteOffer);

export default router;
