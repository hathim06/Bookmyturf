import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Page } from "../../components/Layout";
import { userService } from "../../services/userService";
import { getImageUrl } from "../../utils/imageUrl";
import { requestCancellationReason, showSuccess } from "../../utils/alert";

export default function BookingDetails() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [showOwnerContact, setShowOwnerContact] = useState(false);
  useEffect(() => {
    userService
      .getBookings()
      .then((data) =>
        setBooking(
          (data.bookings || []).find((item) => item._id === id) || null,
        ),
      )
      .catch((requestError) =>
        setError(requestError.message || "Unable to load booking."),
      );
  }, [id]);
  if (error)
    return (
      <Page>
        <main className="userWorkspace">
          <p className="authError">{error}</p>
        </main>
      </Page>
    );
  if (!booking)
    return (
      <Page>
        <main className="userWorkspace">
          <p>Loading booking details...</p>
        </main>
      </Page>
    );
  const image = booking.turf?.primaryImage || booking.turf?.images?.[0] || "";
  const imageUrl = getImageUrl(image);
  const owner = booking.turf?.owner;
  const ownerName = booking.ownerName || owner?.name || "Turf owner";
  const ownerPhone =
    booking.ownerPhone || owner?.phone || booking.turf?.contactNumber || "";
  const hasOwnerContact = Boolean(
    booking.ownerName || booking.ownerPhone || owner?.name || owner?.phone,
  );
  const canCancel = booking.canCancel === true;

  const cancelBooking = async () => {
    const reason = await requestCancellationReason();
    if (!reason) return;
    setCancelling(true);
    setActionError("");
    try {
      const result = await userService.cancelBooking(booking._id, reason);
      setBooking(result.booking);
      if (result.booking.refundStatus === "credited") {
        await showSuccess("Booking cancelled", `₹${Number(result.booking.refundAmount).toLocaleString("en-IN")} refund added to your wallet.`);
      } else {
        await showSuccess("Booking cancelled", "Your booking has been cancelled.");
      }
    } catch (requestError) {
      setActionError(requestError.message || "Unable to cancel booking.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Page>
      <main className="userWorkspace bookingDetailsPage">
        <Link className="backLink" to="/bookings">
          ← My bookings
        </Link>
        <div className="workspaceHeading compact">
          <div>
            <p className="pageKicker">MY BOOKINGS / DETAILS</p>
            <h1>Booking Information</h1>
          </div>
          <span className={`statusPill ${booking.status}`}>{booking.status}</span>
        </div>
        {actionError && <p className="authError" role="alert">{actionError}</p>}
        {booking.status === "cancelled" && booking.refundStatus === "credited" && (
          <div className="bookingRefundNotice" role="status">
            <div>
              <strong>Refund credited to your wallet</strong>
              <span>{`₹${Number(booking.refundAmount || booking.amount).toLocaleString("en-IN")} is available in your wallet.`}</span>
            </div>
            <Link to="/wallet">View wallet</Link>
          </div>
        )}
        <div className="bookingDetailsGrid">
          <section>
            <article className="bookingDetailHero">
              <img src={imageUrl} alt={booking.turf?.name || "Turf"} />
              <div>
                <p className="pageKicker">VENUE</p>
                <h2>{booking.turf?.name || "Turf unavailable"}</h2>
                <p>
                  {booking.turf?.location?.address},{" "}
                  {booking.turf?.location?.city}
                </p>
              </div>
            </article>
            <article className="detailPanel">
              <h2>Booking Information</h2>
              <div className="detailFacts">
                <div>
                  <small>DATE</small>
                  <b>
                    {new Date(booking.date).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </b>
                </div>
                <div>
                  <small>TIME</small>
                  <b>
                    {booking.startTime} - {booking.endTime}
                  </b>
                </div>
                <div>
                  <small>SPORT</small>
                  <b>{booking.sport || "Multi-sport"}</b>
                </div>
              </div>
            </article>
            <article className="detailPanel">
              <h2>Payment Breakdown</h2>
              <div className="breakdownRow">
                <span>Booking amount</span>
                <b>₹{booking.amount}</b>
              </div>
              <div className="breakdownRow">
                <span>Platform fee</span>
                <b>₹0</b>
              </div>
              <div className="breakdownRow total">
                <span>Total paid</span>
                <b>₹{booking.amount}</b>
              </div>
            </article>
          </section>
          <aside className="bookingQrPanel">
            <div className="qrPlaceholder">▦</div>
            <h3>Check-in QR Code</h3>
            <p>Show this code at the venue when you arrive.</p>
            <button
              className="primaryAction"
              onClick={() => setShowOwnerContact((visible) => !visible)}
            >
              {showOwnerContact ? "Hide owner contact" : "Contact Turf Owner"}
            </button>
            {showOwnerContact && (
              <div className="ownerContactPanel">
                {hasOwnerContact ? (
                  <>
                    <strong>{ownerName}</strong>
                    {ownerPhone ? (
                      <a href={`tel:${ownerPhone}`}>{ownerPhone}</a>
                    ) : (
                      <span>Phone number not provided by the owner</span>
                    )}
                  </>
                ) : (
                  <span>Owner contact is not available for this booking.</span>
                )}
              </div>
            )}
            <Link className="outlineAction" to="/turfs">
              Book another turf
            </Link>
            {canCancel && (
              <button className="cancelBookingDetailButton" type="button" onClick={cancelBooking} disabled={cancelling}>
                {cancelling ? "Cancelling…" : "Cancel booking"}
              </button>
            )}
          </aside>
        </div>
      </main>
    </Page>
  );
}
