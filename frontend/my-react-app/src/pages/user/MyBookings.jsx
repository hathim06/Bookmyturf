import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../../components/Layout';
import Pagination from '../../components/Pagination';
import { getAuthToken } from '../../utils/auth';
import { requestCancellationReason } from '../../utils/alert';

const API_URL = 'http://localhost:5000/api/users';
const FOUR_HOURS = 4 * 60 * 60 * 1000;

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    fetch(`${API_URL}/bookings`, { headers: { Authorization: `Bearer ${getAuthToken()}` } })
      .then((response) => response.json().then((data) => response.ok ? data : Promise.reject(new Error(data.message))))
      .then((data) => setBookings(data.bookings || []))
      .catch((requestError) => setError(requestError.message || 'Unable to load bookings.'))
      .finally(() => setLoading(false));
  }, []);

  async function cancelBooking(booking) {
    const reason = await requestCancellationReason();
    if (!reason) return;
    const response = await fetch(`${API_URL}/bookings/${booking._id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${getAuthToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.message || 'Unable to cancel booking.');
    setBookings((items) => items.map((item) => item._id === booking._id ? data.booking : item));
  }

  const upcoming = bookings.filter((booking) => booking.status === 'confirmed');
  const totalPages = Math.max(1, Math.ceil(bookings.length / pageSize));
  const visibleBookings = bookings.slice((page - 1) * pageSize, page * pageSize);

  return <Page><main className="userWorkspace bookingsPage"><div className="workspaceHeading"><div><p className="pageKicker">YOUR ACTIVITY</p><h1>My Bookings</h1><span>Manage your upcoming matches and view history.</span></div><Link className="primaryAction" to="/turfs">Find a turf</Link></div><div className="bookingsLayout"><section className="bookingList"><div className="bookingTabs"><button className="active">Upcoming bookings <b>{upcoming.length}</b></button><button>Past matches</button><button>Cancelled</button></div>{error && <p className="authError">{error}</p>}{loading ? <p className="emptyBooking">Loading bookings...</p> : !bookings.length ? <div className="emptyBooking"><strong>No bookings yet</strong><span>Find a turf and reserve your first game.</span></div> : <><div>{visibleBookings.map((booking) => { const image = booking.turf?.primaryImage || booking.turf?.images?.[0] || ''; const imageUrl = image.startsWith('/') ? `http://localhost:5000${image}` : image; const startAt = new Date(booking.date); const [hours, minutes] = booking.startTime.split(':').map(Number); startAt.setHours(hours, minutes, 0, 0); const canCancel = booking.status === 'confirmed' && startAt.getTime() - Date.now() >= FOUR_HOURS; return <article className="bookingCard" key={booking._id}><img src={imageUrl} alt={booking.turf?.name || 'Turf'} /><div className="bookingCardInfo"><div><p className="pageKicker">{booking.status}</p><h2>{booking.turf?.name || 'Turf unavailable'}</h2></div><p>{booking.turf?.location?.city || 'Location unavailable'}</p><p>{new Date(booking.date).toLocaleDateString()} · {booking.startTime} - {booking.endTime}</p><span>{booking.sport || 'Multi-sport'} · ₹{booking.amount}</span>{booking.cancellationReason && <small>Reason: {booking.cancellationReason}</small>}</div><div className="bookingCardActions"><Link className="primaryAction small" to={`/bookings/${booking._id}`}>View details</Link>{canCancel && <button className="textAction" onClick={() => cancelBooking(booking)}>Cancel</button>}</div></article>; })}</div><div className="bookingsPagination"><Pagination page={page} totalPages={totalPages} onChange={setPage} /></div></>}</section><aside className="bookingStats"><h2>Your Play Stats</h2><div><span>Total bookings</span><b>{bookings.length}</b></div><div><span>Upcoming</span><b>{upcoming.length}</b></div><div><span>Completed</span><b>{bookings.filter((booking) => booking.status === 'completed').length}</b></div></aside></div></main></Page>;
}
