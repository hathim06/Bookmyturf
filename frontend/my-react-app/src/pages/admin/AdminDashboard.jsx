import { useEffect, useState } from "react";
import DashboardShell from "../../components/DashboardShell";
import { subscriptionService } from "../../services/subscriptionService";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const THEME_COLOR = "#16a34a"; // Green theme

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await subscriptionService.adminGetDashboard();
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
      <DashboardShell role="admin" title="Platform Overview" subtitle="Loading analytics...">
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading dashboard...</div>
      </DashboardShell>
    );
  }

  const { stats, recentBookings, monthlyRevenue } = data || {};

  const statCards = stats ? [
    ["₹", "Platform revenue", `₹${stats.totalRevenue.toLocaleString("en-IN")}`, `₹${stats.monthRevenue.toLocaleString("en-IN")} this month`],
    ["♙", "Total users", stats.totalUsers, "Registered customers"],
    ["🏢", "Total owners", stats.totalOwners, "Registered turf owners"],
    ["▦", "Active turfs", stats.totalTurfs, "Listed platforms"],
    ["📋", "Total Bookings", stats.totalBookings, "Across all turfs"],
    ["👑", "Active Subscriptions", stats.activeSubscriptions, `₹${stats.subscriptionRevenue.toLocaleString("en-IN")} sub revenue`],
  ] : [];

  return (
    <DashboardShell
      role="admin"
      title="Platform Overview"
      subtitle={new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
    >
      {error && <p className="authError">{error}</p>}
      
      <section className="dashStats adminStats">
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

      <section className="dashGrid adminGrid">
        <article className="dashPanel growth" style={{ paddingBottom: "30px" }}>
          <div className="panelTitle">
            <h2>Revenue growth</h2>
          </div>
          <div className="growthValue">
            ₹{stats?.totalRevenue.toLocaleString("en-IN")} <small>Total Revenue</small>
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

        <article className="dashPanel activity">
          <div className="panelTitle">
            <h2>Recent activity</h2>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!recentBookings?.length ? (
              <p style={{ color: "#64748b", padding: 20, textAlign: "center" }}>No recent bookings.</p>
            ) : (
              recentBookings.map((b) => (
                <div className="activityRow" key={b._id} style={{ display: "flex", alignItems: "center", gap: 15, padding: "12px", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                  <i style={{ width: 32, height: 32, borderRadius: "50%", background: "#e0e7ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>B</i>
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <b style={{ color: "#1e293b", fontSize: 14 }}>{b.user?.name || "Customer"} booked {b.turf?.name || "a turf"}</b>
                    <small style={{ color: "#64748b", fontSize: 12 }}>
                      ₹{b.amount} · {new Date(b.date || b.createdAt).toLocaleDateString()}
                    </small>
                  </span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
