import Review from "../models/review.js";
import Turf from "../models/turf.js";

export const addReview = async (req, res) => {
  try {
    const turfId = req.params.id;
    const { rating, comment } = req.body;
    const userId = req.user._id;

    const existingReview = await Review.findOne({ user: userId, turf: turfId });
    if (existingReview) {
      return res.status(400).json({ success: false, message: "You have already reviewed this turf." });
    }

    const review = new Review({
      user: userId,
      turf: turfId,
      rating: Number(rating),
      comment
    });

    await review.save();

    // Update turf average rating and review count
    const reviews = await Review.find({ turf: turfId });
    const reviewCount = reviews.length;
    const averageRating = reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviewCount;

    await Turf.findByIdAndUpdate(turfId, {
      averageRating: parseFloat(averageRating.toFixed(1)),
      reviewCount
    });

    res.status(201).json({ success: true, message: "Review added successfully", review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ turf: req.params.id })
      .populate("user", "name profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
