import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Page } from '../../components/Layout';
import Pagination from '../../components/Pagination';
import { requestCancellationReason } from '../../utils/alert';
import { userService } from '../../services/userService';
import { getImageUrl } from '../../utils/imageUrl';

const FOUR_HOURS = 4 * 60 * 60 * 1000;
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TaceAtw6quWlFr';

async function loadRazorpayScript() {
  if (window.Razorpay) return true;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [retryingId, setRetryingId] = useState(null);
  const [searchParams] = useSearchParams();
  const retryBookingId = searchParams.get('retry');
  const [activeTab, setActiveTab] = useState(retryBookingId ? 'pending' : 'upcoming');
  const pageSize = 5;

  const loadBookings = useCallback(() => userService.getBookings()
    .then((data) => setBookings(data.bookings || []))
    .catch((requestError) => setError(requestError.message || 'Unable to load bookings.'))
    .finally(() => setLoading(false)), []);

  useEffect(() => {
    loadBookings();
    const refresh = () => loadBookings();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [loadBookings]);

  async function cancelBooking(booking) {
    const reason = await requestCancellationReason();
    if (!reason) return;
    try {
      const data = await userService.cancelBooking(booking._id, reason);
      setBookings((items) => items.map((item) => item._id === booking._id ? data.booking : item));
    } catch (err) {
      setError(err.message || 'Unable to cancel booking.');
    }
  }

  async function retryPayment(booking) {
    setRetryingId(booking._id);
    setError('');
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Razorpay checkout could not be loaded.');

      const data = await userService.retryPaymentOrder(booking._id);
      if (!data.success) throw new Error(data.message || 'Unable to create payment order.');

      const { order } = data;
      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'TurfBook',
        description: `Retry payment for ${booking.turf?.name || 'booking'}`,
        order_id: order.id,
        handler: async function (paymentResponse) {
          const verifyData = await userService.verifyRetryPayment({
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature,
            bookingId: booking._id,
          });
          if (verifyData.success) {
            setBookings((items) =>
              items.map((item) =>
                item._id === booking._id ? { ...item, status: 'confirmed', paymentStatus: 'paid', canRetryPayment: false } : item,
              ),
            );
          } else {
            setError(verifyData.message || 'Payment verification failed.');
          }
        },
        theme: { color: '#16a34a' },
        modal: {
          ondismiss: () => setRetryingId(null),
        },
      });
      rzp.on('payment.failed', (response) => {
        setError(response.error?.description || 'Payment failed. Retry remains available while the window is open and the slot is free.');
        setRetryingId(null);
        loadBookings();
      });
      rzp.on('payment.authorized', () => setRetryingId(null));
      rzp.open();
    } catch (err) {
      setError(err.message || 'Retry payment failed.');
      setRetryingId(null);
    }
  }

  const upcoming = bookings.filter((b) => b.status === 'confirmed');
  const pending = bookings.filter((b) => b.status === 'pending');
  const past = bookings.filter((b) => b.status === 'completed');
  const cancelled = bookings.filter((b) => b.status === 'cancelled');

  let filteredBookings = bookings;
  if (activeTab === 'upcoming') filteredBookings = upcoming;
  if (activeTab === 'pending') filteredBookings = pending;
  if (activeTab === 'past') filteredBookings = past;
  if (activeTab === 'cancelled') filteredBookings = cancelled;

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize));
  const visibleBookings = filteredBookings.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Page>
      <main className="userWorkspace bookingsPage">
        <div className="workspaceHeading">
          <div>
            <p className="pageKicker">YOUR ACTIVITY</p>
            <h1>My Bookings</h1>
            <span>Manage your upcoming matches and view history.</span>
          </div>
          <Link className="primaryAction" to="/turfs">Find a turf</Link>
        </div>

        <div className="bookingsLayout">
          <section className="bookingList">
            <div className="bookingTabs">
              <button className={activeTab === 'upcoming' ? 'active' : ''} onClick={() => { setActiveTab('upcoming'); setPage(1); }}>
                Upcoming <b>{upcoming.length}</b>
              </button>
              {pending.length > 0 && (
                <button className={activeTab === 'pending' ? 'active' : ''} onClick={() => { setActiveTab('pending'); setPage(1); }}>
                  Payment Pending <b>{pending.length}</b>
                </button>
              )}
              <button className={activeTab === 'past' ? 'active' : ''} onClick={() => { setActiveTab('past'); setPage(1); }}>
                Past matches <b>{past.length}</b>
              </button>
              <button className={activeTab === 'cancelled' ? 'active' : ''} onClick={() => { setActiveTab('cancelled'); setPage(1); }}>
                Cancelled <b>{cancelled.length}</b>
              </button>
            </div>

            {error && <p className="authError">{error}</p>}

            {loading ? (
              <p className="emptyBooking">Loading bookings...</p>
            ) : !filteredBookings.length ? (
              <div className="emptyBooking">
                <strong>No bookings found</strong>
                <span>
                  {activeTab === 'upcoming'
                    ? 'Find a turf and reserve your first game.'
                    : activeTab === 'pending'
                    ? 'No bookings awaiting payment.'
                    : `You have no ${activeTab} bookings.`}
                </span>
              </div>
            ) : (
              <>
                <div>
                  {visibleBookings.map((booking) => {
                    const image = booking.turf?.primaryImage || booking.turf?.images?.[0] || '';
                    const imageUrl = image.startsWith('/') ? `http://localhost:5000${image}` : image;
                    const startAt = new Date(booking.date);
                    const [hrs, mins] = booking.startTime.split(':').map(Number);
                    startAt.setHours(hrs, mins, 0, 0);
                    const canCancel = booking.status === 'confirmed' && startAt.getTime() - Date.now() >= FOUR_HOURS;
                    const retryPaymentPending = booking.status === 'pending' && booking.paymentMethod === 'razorpay';
                    const canRetry = retryPaymentPending && booking.canRetryPayment;

                    return (
                      <article className="bookingCard" key={booking._id}>
                        <img src={imageUrl} alt={booking.turf?.name || 'Turf'} />
                        <div className="bookingCardInfo">
                          <div>
                            <p className={`pageKicker ${booking.status === 'pending' ? 'statusPending' : ''}`}>
                              {booking.status === 'pending' ? '⏳ Payment Pending' : booking.status}
                            </p>
                            <h2>{booking.turf?.name || 'Turf unavailable'}</h2>
                          </div>
                          <p>{booking.turf?.location?.city || 'Location unavailable'}</p>
                          <p>{new Date(booking.date).toLocaleDateString()} · {booking.startTime} – {booking.endTime}</p>
                          <span>{booking.sport || 'Multi-sport'} · ₹{booking.amount}</span>
                          {booking.cancellationReason && <small>Reason: {booking.cancellationReason}</small>}
                          {booking.status === 'cancelled' && booking.refundStatus === 'credited' && (
                            <small className="bookingWalletRefund">{`₹${Number(booking.refundAmount || booking.amount).toLocaleString('en-IN')} refunded to wallet`} · <Link to="/wallet">View wallet</Link></small>
                          )}
                        </div>
                        <div className="bookingCardActions">
                          <Link className="primaryAction small" to={`/bookings/${booking._id}`}>View details</Link>
                          {retryPaymentPending && (
                            <>
                            <button
                              className="retryPayBtn"
                              onClick={() => retryPayment(booking)}
                              disabled={!canRetry || retryingId === booking._id}
                              title={!canRetry ? 'The retry window expired or this slot was booked by another player.' : 'Retry payment'}
                            >
                              {retryingId === booking._id ? 'Processing…' : '💳 Retry Payment'}
                            </button>
                            {!canRetry && <small className="retryUnavailable">Retry unavailable: the slot was booked or the retry window expired.</small>}
                            </>
                          )}
                          {canCancel && (
                            <button className="textAction" onClick={() => cancelBooking(booking)}>Cancel</button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="bookingsPagination">
                  <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
              </>
            )}
          </section>

          <aside className="bookingStats">
            <h2>Your Play Stats</h2>
            <div><span>Total bookings</span><b>{bookings.length}</b></div>
            <div><span>Upcoming</span><b>{upcoming.length}</b></div>
            {pending.length > 0 && <div><span>Awaiting Payment</span><b>{pending.length}</b></div>}
            <div><span>Completed</span><b>{past.length}</b></div>
          </aside>
        </div>
      </main>
    </Page>
  );
}
