import { useCallback, useEffect, useState } from "react";
import apiClient from "../services/apiClient";

export default function TurfReviews({ turfId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(() => {
    setLoading(true);
    apiClient.get(`/turfs/${turfId}/reviews`)
      .then((data) => setReviews(data.reviews || []))
      .catch((requestError) => setError(requestError.message || "Could not load reviews."))
      .finally(() => setLoading(false));
  }, [turfId]);

  useEffect(() => fetchReviews(), [fetchReviews]);

  const average = reviews.length
    ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length
    : 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!rating) {
      setError("Choose a star rating before posting your feedback.");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/turfs/${turfId}/reviews`, { rating, comment: comment.trim() });
      setSuccess("Thanks for sharing your experience.");
      setComment("");
      setRating(0);
      fetchReviews();
    } catch (requestError) {
      setError(requestError.message || "Could not post your review. Please sign in and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="detailPanel reviewPanel" aria-labelledby="player-reviews-title">
      <header className="reviewHeader">
        <div>
          <p className="pageKicker">PLAYER FEEDBACK</p>
          <h2 id="player-reviews-title">Ratings &amp; reviews</h2>
        </div>
        <div className="reviewSummary" aria-label={`${average.toFixed(1)} out of 5 from ${reviews.length} reviews`}>
          <strong>{reviews.length ? average.toFixed(1) : "—"}</strong>
          <span className="reviewSummaryStars" aria-hidden="true">★★★★★</span>
          <small>{reviews.length} {reviews.length === 1 ? "review" : "reviews"}</small>
        </div>
      </header>

      <form className="reviewComposer" onSubmit={handleSubmit}>
        <div className="reviewComposerIntro">
          <h3>How was your game?</h3>
          <p>Rate the venue and share a helpful note with other players.</p>
        </div>
        <div className="starRatingInput" role="group" aria-label="Choose a rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              className={`starBtn ${(hoverRating || rating) >= star ? "active" : ""}`}
              aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
              aria-pressed={rating === star}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onFocus={() => setHoverRating(star)}
              onBlur={() => setHoverRating(0)}
              onClick={() => setRating(star)}
            >★</button>
          ))}
          <span className="starLabel">{rating ? `${rating} out of 5` : "Tap a star to rate"}</span>
        </div>
        <textarea
          className="reviewTextarea"
          placeholder="What stood out about the pitch, facilities, or service?"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={1000}
          rows={4}
        />
        <div className="reviewComposerFooter">
          <small>{comment.length}/1000</small>
          <button type="submit" className="primaryAction" disabled={submitting}>
            {submitting ? "Posting…" : "Post feedback"}
          </button>
        </div>
        {error && <p className="reviewAlert error" role="alert">{error}</p>}
        {success && <p className="reviewAlert success" role="status">{success}</p>}
      </form>

      <div className="reviewsFeed" aria-live="polite">
        {loading ? (
          <p className="reviewsEmpty">Loading player reviews…</p>
        ) : reviews.length ? (
          reviews.map((review) => (
            <article key={review._id} className="reviewItem">
              <div className="reviewItemHeader">
                <div className="reviewerAvatar" aria-hidden="true">
                  {review.user?.name?.charAt(0)?.toUpperCase() || "P"}
                </div>
                <div className="reviewerInfo">
                  <strong>{review.user?.name || "Player"}</strong>
                  <time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</time>
                </div>
                <div className="reviewStars" aria-label={`${review.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, index) => <span key={index} className={index < review.rating ? "star filled" : "star"}>★</span>)}
                </div>
              </div>
              {review.comment && <p className="reviewBody">{review.comment}</p>}
            </article>
          ))
        ) : (
          <div className="reviewsEmpty">
            <span className="reviewsEmptyIcon" aria-hidden="true">★</span>
            <strong>No ratings yet</strong>
            <p>Be the first player to share feedback about this turf.</p>
          </div>
        )}
      </div>
    </section>
  );
}
