import express from 'express';
import { getTurf, listTurfs } from '../controllers/turfController.js';
import { availability } from '../controllers/bookingController.js';
import { addReview, getReviews } from '../controllers/reviewController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { getActiveTurfOffers } from '../controllers/offerController.js';

const router = express.Router();
router.get('/', listTurfs);
router.get('/:id/availability', availability);
router.get('/:id/reviews', getReviews);
router.post('/:id/reviews', protect, addReview);
router.get('/:id/offers', getActiveTurfOffers);
router.get('/:id', getTurf);

export default router;
