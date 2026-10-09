import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../../components/DashboardShell";
import { subscriptionService } from "../../services/subscriptionService";
import { getImageUrl } from "../../utils/imageUrl";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const THEME_COLOR = "#16a34a"; // Green theme

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await subscriptionService.getOwnerDashboard();
        setData(res);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <DashboardShell role="owner" title="Dashboard Overview" subtitle="Loading your analytics...">
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading dashboard...</div>
      </DashboardShell>
    );
  }

  const { stats, recentBookings, monthlyRevenue, activeSubscription } = data || {};

  const statCards = stats ? [
    ["▣", "Total revenue", `₹${stats.totalRevenue.toLocaleString("en-IN")}`, `₹${stats.monthRevenue.toLocaleString("en-IN")} this month`],
    ["◫", "Active bookings", stats.confirmedBookings, "Overall confirmed"],
    ["♙", "Total customers", stats.totalBookings, "Total bookings"],
    ["☆", "Avg. rating", stats.avgRating, `${stats.totalTurfs} Turfs listed`],
  ] : [];

  return (
    <DashboardShell
      role="owner"
      title="Dashboard Overview"
      subtitle={new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
    >
      {error && <p className="authError">{error}</p>}
      
      {activeSubscription && (
        <div style={{ background: "linear-gradient(90deg, #f59e0b22, #f59e0b11)", borderLeft: "4px solid #f59e0b", padding: "12px 20px", borderRadius: 8, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <strong style={{ color: "#f59e0b" }}>👑 Monthly Subscription Active</strong>
            <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>Your plan renews on {new Date(activeSubscription.endDate).toLocaleDateString("en-IN")}</p>
          </div>
          <button onClick={() => navigate("/owner/subscription")} style={{ background: "#f59e0b", color: "#fff", padding: "6px 16px", borderRadius: 20, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Manage</button>
        </div>
      )}

      <section className="dashStats">
        {statCards.map(([icon, label, value, change]) => (
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
        <article className="dashPanel growth" style={{ paddingBottom: "30px" }}>
          <div className="panelTitle">
            <h2>Revenue growth</h2>
          </div>
          <div className="growthValue">
            ₹{stats?.totalRevenue.toLocaleString("en-IN")} <small>Total</small>
          </div>
          
          <div style={{ height: 220, marginTop: 24, width: "100%" }}>
             {(!monthlyRevenue || monthlyRevenue.length === 0) ? (
                <p style={{ color: "#64748b" }}>No revenue data.</p>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                    <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }} formatter={(val) => [`₹${val}`, "Revenue"]} />
                    <Bar dataKey="revenue" fill={THEME_COLOR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             )}
          </div>
        </article>

        <article className="dashPanel bookings">
          <div className="panelTitle">
            <h2>Recent bookings</h2>
            <button data-confirmation-skip="true" onClick={() => navigate("/owner/bookings")}>
              View all
            </button>
          </div>
          {!recentBookings?.length ? (
            <p style={{ padding: "20px", color: "#64748b", textAlign: "center" }}>No customer bookings yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {recentBookings.map((booking) => (
                <div
                  className="bookingRow"
                  key={booking._id}
                  style={{ display: "flex", alignItems: "center", gap: "15px", padding: "12px", border: "1px solid #e2e8f0", borderRadius: 8 }}
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
                      <img src={getImageUrl(booking.user.profilePicture)} alt="Customer" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      booking.user?.name?.[0]?.toUpperCase()
                    )}
                  </div>
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <b style={{ color: "#1e293b", fontSize: 14 }}>{booking.user?.name || "Customer"}</b>
                    <small style={{ color: "#64748b", fontSize: 12 }}>
                      {booking.turf?.name || "Turf"} · {new Date(booking.date).toLocaleDateString()} {booking.startTime}
                    </small>
                  </span>
                  <em
                    style={{ 
                      marginLeft: "auto", 
                      fontSize: 12, 
                      fontWeight: 600, 
                      padding: "4px 10px", 
                      borderRadius: 12,
                      background: booking.status === "pending" ? "#fef3c7" : booking.status === "confirmed" ? "#dcfce7" : "#f1f5f9",
                      color: booking.status === "pending" ? "#d97706" : booking.status === "confirmed" ? "#16a34a" : "#64748b"
                    }}
                  >
                    {booking.status}
                  </em>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </DashboardShell>
  );
}
