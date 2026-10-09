import { useEffect, useState } from "react";
import DashboardShell from "../../components/DashboardShell";
import Pagination from "../../components/Pagination";
import { ownerTurfService } from "../../services/ownerTurfService";


export default function OwnerBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    async function loadBookings() {
      try {
        const data = await ownerTurfService.getBookings();
        setBookings(Array.isArray(data) ? data : data.bookings || []);
      } catch (requestError) {
        setError(requestError.message || "Unable to load bookings.");
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, []);

  const totalPages = Math.max(1, Math.ceil(bookings.length / pageSize));
  const paginatedBookings = bookings.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  return (
    <DashboardShell
      role="owner"
      title="Booking overview"
      subtitle="Track confirmed, pending, and completed turf bookings"
    >
      <section className="managementCard">
        <div className="panelTitle">
          <div>
            <h2>Bookings</h2>
            <p>Recent customer activity across your venues</p>
          </div>
        </div>

        {error && <p className="authError">{error}</p>}

        {loading ? (
          <p className="managementEmpty">Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <p className="managementEmpty">
            No bookings have been made for your turfs yet.
          </p>
        ) : (
          <>
            <div className="accountTable">
              <div className="accountRow accountHead">
                <span>Customer</span>
                <span>Turf</span>
                <span>Date</span>
                <span>Status</span>
              </div>

              {paginatedBookings.map((booking) => (
                <div className="accountRow" key={booking._id}>
                  <span>
                    <b>{booking.user?.name || "Customer"}</b>
                    <small>{booking.user?.email || "No email"}</small>
                  </span>
                  <span>
                    <b>{booking.turf?.name || "Turf"}</b>
                    <small>₹{booking.amount || 0}</small>
                  </span>
                  <span>
                    <small>{new Date(booking.date).toLocaleDateString()}</small>
                    <small>
                      {booking.startTime} - {booking.endTime}
                    </small>
                  </span>
                  <span>
                    <em
                      className={
                        booking.status === "cancelled" ? "blocked" : ""
                      }
                    >
                      {booking.status || "pending"}
                    </em>
                  </span>
                </div>
              ))}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
            />
          </>
        )}
      </section>
    </DashboardShell>
  );
}
