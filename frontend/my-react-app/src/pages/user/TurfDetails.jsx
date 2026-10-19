import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Page } from "../../components/Layout";
import { images } from "../../data/turfs";
import { formatTime, formatTimeRange, todayKey } from "../../utils/time";
import apiClient from "../../services/apiClient";
import { getImageUrl } from "../../utils/imageUrl";
import TurfReviews from "../../components/TurfReviews";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function computeDiscountedPrice(pricePerHour, offer) {
  if (!offer) return null;
  const discounted =
    offer.discountType === "percentage"
      ? pricePerHour - (pricePerHour * offer.discountValue) / 100
      : pricePerHour - offer.discountValue;
  return Math.max(0, Math.round(discounted));
}

function formatOfferDays(daysOfWeek) {
  if (!daysOfWeek?.length) return "Selected date only";
  return daysOfWeek.sort((a, b) => a - b).map((d) => DAY_NAMES[d]).join(", ");
}

export default function TurfDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [turf, setTurf] = useState(null);
  const [offers, setOffers] = useState([]);
  const [date, setDate] = useState(searchParams.get("date") || "");
  const [slots, setSlots] = useState([]);
  const [activeSlot, setActiveSlot] = useState(null);
  const [error, setError] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    apiClient.get(`/turfs/${id}`)
      .then(({ data }) => {
        setTurf(data);
      })
      .catch((requestError) => setError(requestError.message || "Unable to load this turf."));
  }, [id]);

  useEffect(() => {
    setOffers([]);
    if (!date) return;
    apiClient.get(`/turfs/${id}/offers?date=${date}`)
      .then((data) => setOffers(data.offers || []))
      .catch(() => setOffers([]));
  }, [id, date]);

  useEffect(() => {
    if (!date) return;
    setActiveSlot(null);
    let active = true;
    let firstLoad = true;
    const refreshSlots = () => {
      if (firstLoad) setLoadingSlots(true);
      apiClient.get(`/turfs/${id}/availability?date=${date}`)
        .then((data) => { if (active) setSlots(data.slots || []); })
        .catch((requestError) => { if (active) setError(requestError.message || "Unable to load slots."); })
        .finally(() => {
          if (active && firstLoad) setLoadingSlots(false);
          firstLoad = false;
        });
    };
    refreshSlots();
    const timer = window.setInterval(refreshSlots, 15000);
    window.addEventListener("focus", refreshSlots);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshSlots);
    };
  }, [id, date]);

  if (error && !turf)
    return (
      <Page>
        <div className="detailsPage">
          <p className="authError">{error}</p>
          <Link to="/turfs">Back to turfs</Link>
        </div>
      </Page>
    );
  if (!turf)
    return (
      <Page>
        <div className="detailsPage">
          <p>Loading turf...</p>
        </div>
      </Page>
    );

  const gallery = (turf.images?.length ? turf.images : [images.arena, images.cricket]).map((image) => getImageUrl(image));
  const location = `${turf.location.address}, ${turf.location.city}${turf.location.state ? `, ${turf.location.state}` : ""}`;

  // Best offer for pricing display
  const bestOffer = offers[0] || null;
  const discountedPrice = bestOffer ? computeDiscountedPrice(turf.pricePerHour, bestOffer) : null;

  return (
    <Page>
      <div className="detailsPage">
        {/* Hero gallery */}
        <div style={{ background: "#0f172a", padding: 0 }}>
          <div className="detailsHeroGrid" style={{ margin: "0 auto", maxWidth: "none", width: "100%" }}>
            <div className="detailsHeroMain">
              <img src={gallery[0]} alt={turf.name} />
            </div>
            <div className="detailsHeroSide">
              {gallery.slice(1, 3).map((image) => (
                <img key={image} src={image} alt="Turf view" />
              ))}
            </div>
          </div>
        </div>

        <div className="detailsBody">
          <div className="detailsMain">
            {/* Title card */}
            <div className="detailsTitleCard">
              <h1>{turf.name}</h1>
              <p className="detailsLocation">{location}</p>
              <div className="detailsMeta">
                <span className="detailsRating">
                  {turf.averageRating ? turf.averageRating.toFixed(1) + " ★" : "New"}{" "}
                  <span>({turf.reviewCount || 0} reviews)</span>
                </span>
                <span className="detailsSport">{turf.category || turf.turfType}</span>
              </div>
            </div>

            {/* Active Offers Section */}
            {offers.length > 0 && (
              <div className="detailsOffersSection">
                <h3>🎁 Special Offers</h3>
                <div className="detailsOffersList">
                  {offers.map((offer) => (
                    <div key={offer._id} className="detailsOfferCard">
                      <div className="detailsOfferBadge">
                        {offer.discountType === "percentage"
                          ? `${offer.discountValue}% OFF`
                          : `₹${offer.discountValue} OFF`}
                      </div>
                      <div className="detailsOfferInfo">
                        <strong>{offer.title}</strong>
                        {offer.description && <p>{offer.description}</p>}
                        <small>
                          📅 {formatOfferDays(offer.daysOfWeek)}
                          {offer.validTo && ` · Valid until ${new Date(offer.validTo).toLocaleDateString("en-IN")}`}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* About */}
            <div className="detailsCard">
              <h3>About this Turf</h3>
              <p>{turf.description || "A quality sports venue ready for your next game."}</p>
              <h4>Facilities</h4>
              <div className="amenitiesGrid">
                {(turf.facilities || []).map((facility) => (
                  <span className="amenityBadge" key={facility}>✓ {facility}</span>
                ))}
              </div>
            </div>

            {/* Venue info */}
            <div className="detailsCard">
              <h3>Venue information</h3>
              <p>Open {formatTime(turf.openingTime)} – {formatTime(turf.closingTime)}</p>
              <p>{turf.rules || "Please follow venue instructions and leave the turf ready for the next players."}</p>
            </div>

            {/* Map */}
            <div className="detailsCard">
              <h3>Location</h3>
              <p>{location}</p>
              {turf.location.latitude && turf.location.longitude && (
                <iframe
                  title="Turf location"
                  width="100%"
                  height="240"
                  loading="lazy"
                  src={`https://www.google.com/maps?q=${turf.location.latitude},${turf.location.longitude}&z=15&output=embed`}
                />
              )}
            </div>

            <TurfReviews turfId={turf._id} />
          </div>

          {/* Booking widget */}
          <aside className="bookingWidget">
            <h2>Book a Slot</h2>
            <p className="bookingWidgetSub">{turf.name}</p>

            {/* Pricing display */}
            <div className="bookingPriceRow">
              {bestOffer && discountedPrice !== null ? (
                <>
                  <span className="bookingOriginalPrice">₹{turf.pricePerHour}/hr</span>
                  <strong className="bookingDiscountPrice">₹{discountedPrice}/hr</strong>
                  <span className="bookingOfferTag">
                    {bestOffer.discountType === "percentage"
                      ? `${bestOffer.discountValue}% off`
                      : `₹${bestOffer.discountValue} off`}
                  </span>
                </>
              ) : (
                <strong>₹{turf.pricePerHour}/hr</strong>
              )}
            </div>

            <div className="widgetSection">
              <label className="bookingDateLabel">
                Choose a date
                <input
                  type="date"
                  min={todayKey()}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>
            </div>

            {date && (
              <div className="widgetSection">
                <h4>Available Slots</h4>
                {loadingSlots ? (
                  <p>Loading slots...</p>
                ) : (
                  <div className="slotsGrid">
                    {slots.map((slot) => (
                      <button
                        type="button"
                        key={`${slot.startTime}-${slot.endTime}`}
                        disabled={!slot.available}
                        className={
                          activeSlot?.startTime === slot.startTime
                            ? "slotBtn active"
                            : !slot.available
                            ? "slotBtn unavailable"
                            : "slotBtn"
                        }
                        onClick={() => setActiveSlot(slot)}
                      >
                        {formatTimeRange(slot.startTime, slot.endTime)}
                        <small>
                          {slot.available
                            ? slot.originalPrice && slot.originalPrice !== slot.price
                              ? <span>{slot.offerTitle && <b>{slot.offerTitle} · </b>}<del>₹{slot.originalPrice}</del> ₹{slot.price}</span>
                              : `₹${slot.price}`
                            : "Unavailable"}
                        </small>
                      </button>
                    ))}
                  </div>
                )}
                {!loadingSlots && !slots.length && <p>No slots are configured.</p>}
              </div>
            )}

            {error && <p className="authError">{error}</p>}
            <div className="bookingTotal">
              <span>Total {activeSlot ? "(1 Slot)" : ""}</span>
              <strong>{activeSlot ? `₹${activeSlot.price}` : "—"}</strong>
            </div>
            <Link
              className="bookNowBtn"
              to={
                activeSlot
                  ? `/checkout?turf=${turf._id}&slot=${encodeURIComponent(`${activeSlot.startTime}-${activeSlot.endTime}`)}&date=${date}`
                  : "#"
              }
              onClick={(event) => { if (!activeSlot) event.preventDefault(); }}
            >
              Proceed to Book →
            </Link>
          </aside>
        </div>
      </div>
    </Page>
  );
}
