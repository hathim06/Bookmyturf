import { useEffect, useState } from 'react';
import DashboardShell from '../../components/DashboardShell';
import Pagination from '../../components/Pagination';
import { adminService } from '../../services/adminService';


export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function loadBookings() {
      try {
        const data = await adminService.getBookings({ page: String(page), limit: '5' });
        setBookings(Array.isArray(data.bookings) ? data.bookings : []);
        setTotalPages(Math.max(1, Number(data.totalPages || 1)));
      } catch (requestError) {
        setError(requestError.message || 'Unable to load bookings.');
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, [page]);

  return (
    <DashboardShell role="admin" title="Booking activity" subtitle="Monitoring all turf reservations across the platform">
      <section className="managementCard">
        <div className="panelTitle">
          <div>
            <h2>All bookings</h2>
            <p>Platform-wide booking overview</p>
          </div>
        </div>

        {error && <p className="authError">{error}</p>}

        {loading ? (
          <p className="managementEmpty">Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <p className="managementEmpty">No bookings have been created yet.</p>
        ) : (
          <>
            <div className="accountTable">
              <div className="accountRow accountHead">
                <span>User</span>
                <span>Turf</span>
                <span>Schedule</span>
                <span>Status</span>
              </div>

              {bookings.map((booking) => (
                <div className="accountRow" key={booking._id}>
                  <span>
                    <b>{booking.user?.name || 'Customer'}</b>
                    <small>{booking.user?.email || 'No email'}</small>
                  </span>
                  <span>
                    <b>{booking.turf?.name || 'Turf'}</b>
                    <small>₹{booking.amount || 0}</small>
                  </span>
                  <span>
                    <small>{new Date(booking.date).toLocaleDateString()}</small>
                    <small>{booking.startTime} - {booking.endTime}</small>
                  </span>
                  <span>
                    <em className={booking.status === 'cancelled' ? 'blocked' : ''}>{booking.status || 'pending'}</em>
                  </span>
                </div>
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </section>
    </DashboardShell>
  );
}
