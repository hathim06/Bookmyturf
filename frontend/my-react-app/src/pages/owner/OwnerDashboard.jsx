import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../../components/DashboardShell";
import { getAuthToken } from "../../utils/auth";
import Pagination from "../../components/Pagination";

const API_URL = "http://localhost:5000/api/owner";
const stats = [
  ["▣", "Total revenue", "₹12,480", "+12.5% this month"],
  ["◫", "Active bookings", "48", "8 today"],
  ["♙", "Total customers", "1,286", "+8.4% this month"],
  ["☆", "Avg. rating", "4.8", "from 124 reviews"],
];

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageSize = 5;

  useEffect(() => {
    async function loadBookings() {
      try {
        const response = await fetch(`${API_URL}/bookings`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Unable to load bookings.");
        setBookings(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadBookings();
  }, []);

  const totalPages = Math.max(1, Math.ceil(bookings.length / pageSize));
  const visibleBookings = bookings.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  return (
    <DashboardShell
      role="owner"
      title="Dashboard Overview"
      subtitle="Tuesday, 3 September 2026"
    >
      <section className="dashStats">
        {stats.map(([icon, label, value, change]) => (
          <article key={label}>
            <i>{icon}</i>
            <span>
              {label}
              <b>{value}</b>
              <small>{change}</small>
            </span>
          </article>
        ))}
      </section>
      <section className="dashGrid">
        <article className="dashPanel growth">
          <div className="panelTitle">
            <h2>Revenue growth</h2>
            <button>This year⌄</button>
          </div>
          <div className="growthValue">
            ₹12,480 <small>+12.5%</small>
          </div>
          <div className="chart">
            <span></span>
          </div>
          <div className="chartMonths">
            Jan　 Feb　 Mar　 Apr　 May　 Jun　 Jul　 Aug　 Sep
          </div>
        </article>
        <article className="dashPanel bookings">
          <div className="panelTitle">
            <h2>Customer bookings</h2>
            <button onClick={() => navigate("/owner/bookings")}>
              View all
            </button>
          </div>
          {error && <p className="authError">{error}</p>}
          {loading ? (
            <p style={{ padding: "10px 20px" }}>Loading customers...</p>
          ) : bookings.length === 0 ? (
            <p style={{ padding: "10px 20px" }}>No customer bookings yet.</p>
          ) : (
            <>
              {visibleBookings.map((booking) => (
                <div
                  className="bookingRow"
                  key={booking._id}
                  title={`${booking.user?.email || ""} | ${booking.user?.phone || ""}`}
                  style={{ display: "flex", alignItems: "center", gap: "15px" }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                      fontWeight: 600,
                      color: "#64748b",
                    }}
                  >
                    {booking.user?.profilePicture ? (
                      <img
                        src={`http://localhost:5000${booking.user.profilePicture}`}
                        alt="Customer"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      booking.user?.name?.[0]?.toUpperCase()
                    )}
                  </div>
                  <span>
                    <b>{booking.user?.name || "Customer"}</b>
                    <small>
                      {booking.turf?.name || "Turf"}
                      <br />
                      {new Date(booking.date).toLocaleDateString()}{" "}
                      {booking.startTime}
                    </small>
                  </span>
                  <em
                    className={booking.status === "pending" ? "pending" : ""}
                    style={{ marginLeft: "auto" }}
                  >
                    {booking.status}
                  </em>
                </div>
              ))}
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
              />
            </>
          )}
        </article>
      </section>
    </DashboardShell>
  );
}
