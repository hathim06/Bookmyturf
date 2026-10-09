import { useEffect, useRef, useState } from "react";
import DashboardShell from "../../components/DashboardShell";
import Pagination from "../../components/Pagination";
import { subscriptionService } from "../../services/subscriptionService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const STATUS_COLORS = {
  confirmed: "#22c55e",
  completed: "#0ea5e9",
  cancelled: "#ef4444",
  pending: "#f59e0b",
};
const PLAN_COLORS = { monthly: "#f59e0b" };
const PLAN_ICONS = { monthly: "👑" };
const THEME_COLOR = "#16a34a"; // Green theme

export default function AdminReport() {
  const [report, setReport] = useState(null);
  const [subStats, setSubStats] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tab, setTab] = useState("summary");
  const [subPage, setSubPage] = useState(1);
  const [subSearch, setSubSearch] = useState("");
  const [subTotalPages, setSubTotalPages] = useState(1);
  
  const [bookingPage, setBookingPage] = useState(1);
  const reportRequestId = useRef(0);

  const fetchReport = async () => {
    const requestId = ++reportRequestId.current;
    setLoading(true);
    try {
      const params = { page: bookingPage, limit: 10 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const [r, stats] = await Promise.all([
        subscriptionService.adminGetReport(params),
        subscriptionService.adminGetStats(),
      ]);
      if (requestId === reportRequestId.current) {
        setReport(r);
        setSubStats(stats);
      }
    } catch {
      if (requestId === reportRequestId.current) setReport(null);
    } finally {
      if (requestId === reportRequestId.current) setLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const data = await subscriptionService.adminGetAll({ page: subPage, search: subSearch });
      setSubscriptions(data.subscriptions);
      setSubTotalPages(data.totalPages || 1);
    } catch {
      //
    }
  };

  useEffect(() => { fetchReport(); }, [startDate, endDate, bookingPage]);
  useEffect(() => { fetchSubscriptions(); }, [subPage, subSearch]);

  const downloadPDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString("en-IN");

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("BookMyTurf", 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Admin Platform Report", 14, 27);
    doc.text(`Generated: ${now}`, 14, 34);
    if (startDate || endDate) doc.text(`Period: ${startDate || "All"} → ${endDate || "All"}`, 100, 34);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Platform Summary", 14, 52);

    autoTable(doc, {
      startY: 57,
      head: [["Metric", "Value"]],
      body: [
        ["Total Bookings", report.summary.totalBookings],
        ["Confirmed", report.summary.confirmed],
        ["Cancelled", report.summary.cancelled],
        ["Pending", report.summary.pending],
        ["Total Revenue", `₹${report.summary.totalRevenue.toLocaleString("en-IN")}`],
        ["Total Users", report.summary.totalUsers],
        ["Total Owners", report.summary.totalOwners],
        ["Total Turfs", report.summary.totalTurfs],
        ...(subStats ? [["Active Subscriptions", subStats.activeCount], ["Subscription Revenue", `₹${subStats.totalRevenue.toLocaleString("en-IN")}`]] : []),
      ],
      theme: "grid",
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    if (report.turfBreakdown.length) {
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Top Turfs", 14, doc.lastAutoTable.finalY + 14);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 19,
        head: [["Turf Name", "Bookings", "Revenue"]],
        body: report.turfBreakdown.map((t) => [t.name, t.bookings, `₹${t.revenue.toLocaleString("en-IN")}`]),
        theme: "grid",
        headStyles: { fillColor: [22, 163, 74], textColor: 255 },
      });
    }

    if (report.bookings.length) {
      doc.addPage();
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("All Bookings (Current Page)", 14, 20);
      autoTable(doc, {
        startY: 25,
        head: [["Customer", "Email", "Turf", "City", "Date", "Amount", "Status"]],
        body: report.bookings.map((b) => [
          b.user?.name || "N/A",
          b.user?.email || "N/A",
          b.turf?.name || "N/A",
          b.turf?.location?.city || "N/A",
          new Date(b.date).toLocaleDateString("en-IN"),
          `₹${b.amount}`,
          b.status,
        ]),
        theme: "striped",
        headStyles: { fillColor: [22, 163, 74], textColor: 255 },
        styles: { fontSize: 7 },
      });
    }

    doc.save(`admin-report-${now.replace(/\//g, "-")}.pdf`);
  };

  const downloadExcel = () => {
    if (!report) return;
    const wb = XLSX.utils.book_new();

    const summaryData = [
      ["Metric", "Value"],
      ["Total Bookings", report.summary.totalBookings],
      ["Confirmed", report.summary.confirmed],
      ["Cancelled", report.summary.cancelled],
      ["Pending", report.summary.pending],
      ["Total Revenue (₹)", report.summary.totalRevenue],
      ["Total Users", report.summary.totalUsers],
      ["Total Owners", report.summary.totalOwners],
      ["Total Turfs", report.summary.totalTurfs],
      ...(subStats ? [["Active Subscriptions", subStats.activeCount], ["Subscription Revenue (₹)", subStats.totalRevenue]] : []),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Summary");

    if (report.monthly.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Month", "Revenue (₹)"], ...report.monthly.map((m) => [m.month, m.revenue])]), "Monthly Revenue");
    }
    if (report.turfBreakdown.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Turf", "Bookings", "Revenue (₹)"], ...report.turfBreakdown.map((t) => [t.name, t.bookings, t.revenue])]), "Top Turfs");
    }
    if (report.bookings.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ["Customer", "Email", "Phone", "Turf", "City", "Date", "Start", "End", "Amount (₹)", "Status"],
        ...report.bookings.map((b) => [b.user?.name, b.user?.email, b.user?.phone, b.turf?.name, b.turf?.location?.city, new Date(b.date).toLocaleDateString("en-IN"), b.startTime, b.endTime, b.amount, b.status]),
      ]), "Bookings");
    }

    XLSX.writeFile(wb, `admin-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const statCards = report && subStats
    ? [
        { label: "Total Revenue", value: `₹${report.summary.totalRevenue.toLocaleString("en-IN")}`, icon: "💰", color: THEME_COLOR },
        { label: "Total Bookings", value: report.summary.totalBookings, icon: "📋", color: "#3b82f6" },
        { label: "Active Subscriptions", value: subStats.activeCount, icon: "🔑", color: "#f59e0b" },
        { label: "Subscription Revenue", value: `₹${subStats.totalRevenue.toLocaleString("en-IN")}`, icon: "💳", color: "#0ea5e9" },
        { label: "Total Users", value: report.summary.totalUsers, icon: "👤", color: "#a855f7" },
        { label: "Total Owners", value: report.summary.totalOwners, icon: "🏢", color: "#ec4899" },
      ]
    : [];

  return (
    <DashboardShell role="admin" title="Reports" subtitle="Platform-wide analytics and subscription management">
      <div className="report-wrap" style={{ background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0", color: "#1e293b" }}>
        {/* Filters */}
        <div className="report-filters" style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="report-filter-group" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b" }}>From</label>
            <input type="date" value={startDate} onChange={(e) => {setStartDate(e.target.value); setBookingPage(1);}} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px", outline: "none" }} />
          </div>
          <div className="report-filter-group" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b" }}>To</label>
            <input type="date" value={endDate} onChange={(e) => {setEndDate(e.target.value); setBookingPage(1);}} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px", outline: "none" }} />
          </div>
          <button className="report-fetch-btn" onClick={() => fetchReport()} disabled={loading} style={{ background: THEME_COLOR, color: "white", padding: "9px 16px", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>{loading ? "Loading…" : "🔍 Generate Report"}</button>
          {report && (
            <>
              <button className="report-dl-pdf" onClick={downloadPDF} style={{ background: "#334155", color: "white", padding: "9px 16px", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>⬇ PDF</button>
              <button className="report-dl-excel" onClick={downloadExcel} style={{ background: "#334155", color: "white", padding: "9px 16px", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>⬇ Excel</button>
            </>
          )}
        </div>

        {loading && <div className="report-loading" style={{ padding: "40px", textAlign: "center", color: "#64748b" }}><p>Generating report…</p></div>}

        {report && !loading && (
          <>
            <div className="report-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "30px" }}>
              {statCards.map((s) => (
                <div key={s.label} className="report-stat-card" style={{ border: `1px solid ${s.color}44`, padding: "16px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "16px", background: "#f8fafc" }}>
                  <span className="report-stat-icon" style={{ background: `${s.color}22`, color: s.color, width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", fontSize: "20px" }}>{s.icon}</span>
                  <div>
                    <p className="report-stat-label" style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase" }}>{s.label}</p>
                    <h3 className="report-stat-value" style={{ margin: 0, color: s.color, fontSize: "20px", fontWeight: "800" }}>{s.value}</h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Subscription Plan Breakdown */}
            {subStats?.planBreakdown?.length > 0 && (
              <div className="report-plan-breakdown" style={{ marginBottom: "30px" }}>
                <h3 style={{ color: "#0f172a", margin: "0 0 16px" }}>Active Subscriptions by Plan</h3>
                <div className="report-plan-cards" style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {subStats.planBreakdown.map((p) => (
                    <div key={p._id} className="report-plan-item" style={{ border: `1px solid ${PLAN_COLORS[p._id] || "#f59e0b"}`, padding: "16px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "16px", background: "#fff", flex: 1, minWidth: "200px" }}>
                      <span style={{ fontSize: "24px" }}>{PLAN_ICONS[p._id] || "👑"}</span>
                      <div>
                        <strong style={{ color: PLAN_COLORS[p._id] || "#f59e0b", textTransform: "capitalize", fontSize: "16px", display: "block" }}>{p._id}</strong>
                        <p style={{ color: "#64748b", fontSize: "13px", margin: "4px 0 0" }}>{p.count} subscribers · ₹{p.revenue.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="sub-tabs" style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>
              <button style={{ background: tab === "summary" ? THEME_COLOR : "transparent", color: tab === "summary" ? "white" : "#64748b", padding: "8px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "bold" }} onClick={() => setTab("summary")}>📊 Monthly</button>
              <button style={{ background: tab === "turfs" ? THEME_COLOR : "transparent", color: tab === "turfs" ? "white" : "#64748b", padding: "8px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "bold" }} onClick={() => setTab("turfs")}>🏆 Top Turfs</button>
              <button style={{ background: tab === "bookings" ? THEME_COLOR : "transparent", color: tab === "bookings" ? "white" : "#64748b", padding: "8px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "bold" }} onClick={() => setTab("bookings")}>📋 Bookings</button>
              <button style={{ background: tab === "subs" ? THEME_COLOR : "transparent", color: tab === "subs" ? "white" : "#64748b", padding: "8px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "bold" }} onClick={() => setTab("subs")}>🔑 Subscriptions</button>
            </div>

            {tab === "summary" && (
              <div className="report-monthly">
                <h3 style={{ color: "#0f172a", marginBottom: "20px" }}>Monthly Revenue</h3>
                {report.monthly.length === 0 ? <p style={{ color: "#64748b" }}>No revenue data.</p> : (
                  <div style={{ height: 300, width: "100%", background: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={report.monthly.map(m => ({ name: m.month.slice(5), revenue: m.revenue }))} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                        <Tooltip cursor={{ fill: "#e2e8f0" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }} formatter={(val) => [`₹${val}`, "Revenue"]} />
                        <Bar dataKey="revenue" fill={THEME_COLOR} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {tab === "turfs" && (
              <div className="report-table-wrap" style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <h3 style={{ color: "#0f172a", margin: "0 0 16px" }}>Top Performing Turfs</h3>
                <table className="report-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead><tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}><th style={{ padding: "12px", color: "#475569" }}>#</th><th style={{ padding: "12px", color: "#475569" }}>Turf Name</th><th style={{ padding: "12px", color: "#475569" }}>Bookings</th><th style={{ padding: "12px", color: "#475569" }}>Revenue</th></tr></thead>
                  <tbody>
                    {report.turfBreakdown.map((t, i) => (
                      <tr key={t.name} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "12px" }}><strong style={{ color: "#f59e0b" }}>#{i + 1}</strong></td>
                        <td style={{ padding: "12px" }}><strong>{t.name}</strong></td>
                        <td style={{ padding: "12px" }}>{t.bookings}</td>
                        <td style={{ padding: "12px", color: THEME_COLOR, fontWeight: 700 }}>₹{t.revenue.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "bookings" && (
              <div className="report-table-wrap" style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <h3 style={{ color: "#0f172a", margin: "0 0 16px" }}>All Bookings</h3>
                <table className="report-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead><tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}><th style={{ padding: "12px", color: "#475569" }}>Customer</th><th style={{ padding: "12px", color: "#475569" }}>Turf</th><th style={{ padding: "12px", color: "#475569" }}>City</th><th style={{ padding: "12px", color: "#475569" }}>Date</th><th style={{ padding: "12px", color: "#475569" }}>Amount</th><th style={{ padding: "12px", color: "#475569" }}>Status</th></tr></thead>
                  <tbody>
                    {report.bookings.map((b) => (
                      <tr key={b._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "12px" }}><div style={{ fontWeight: 600 }}>{b.user?.name || "N/A"}</div><div style={{ fontSize: 12, color: "#64748b" }}>{b.user?.email}</div></td>
                        <td style={{ padding: "12px" }}>{b.turf?.name || "N/A"}</td>
                        <td style={{ padding: "12px" }}>{b.turf?.location?.city || "N/A"}</td>
                        <td style={{ padding: "12px" }}>{new Date(b.date).toLocaleDateString("en-IN")}</td>
                        <td style={{ padding: "12px", fontWeight: 700, color: THEME_COLOR }}>₹{b.amount}</td>
                        <td style={{ padding: "12px" }}><span style={{ background: `${STATUS_COLORS[b.status] || "#64748b"}22`, color: STATUS_COLORS[b.status] || "#64748b", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {report.bookings.length === 0 && <p style={{ color: "#64748b", textAlign: "center", padding: 24 }}>No bookings found.</p>}
                
                {report.pagination && report.pagination.totalPages > 1 && (
                  <div style={{ marginTop: "16px" }}>
                     <Pagination
                        page={report.pagination.page}
                        totalPages={report.pagination.totalPages}
                        onChange={setBookingPage}
                     />
                  </div>
                )}
              </div>
            )}

            {tab === "subs" && (
              <div className="report-table-wrap" style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ color: "#0f172a", margin: 0 }}>All Subscriptions</h3>
                  <input className="report-search-input" placeholder="Search owner…" value={subSearch} onChange={(e) => { setSubSearch(e.target.value); setSubPage(1); }} style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px", outline: "none" }} />
                </div>
                <table className="report-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead><tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}><th style={{ padding: "12px", color: "#475569" }}>Owner</th><th style={{ padding: "12px", color: "#475569" }}>Email</th><th style={{ padding: "12px", color: "#475569" }}>Plan</th><th style={{ padding: "12px", color: "#475569" }}>Amount</th><th style={{ padding: "12px", color: "#475569" }}>Start</th><th style={{ padding: "12px", color: "#475569" }}>End</th><th style={{ padding: "12px", color: "#475569" }}>Status</th></tr></thead>
                  <tbody>
                    {subscriptions.map((s) => (
                      <tr key={s._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "12px" }}><strong>{s.owner?.name || "N/A"}</strong></td>
                        <td style={{ padding: "12px", color: "#64748b", fontSize: 13 }}>{s.owner?.email}</td>
                        <td style={{ padding: "12px" }}><span style={{ color: PLAN_COLORS[s.plan] || "#f59e0b" }}>{PLAN_ICONS[s.plan] || "👑"} <strong style={{ textTransform: "capitalize" }}>{s.plan}</strong></span></td>
                        <td style={{ padding: "12px" }}>₹{s.amount}</td>
                        <td style={{ padding: "12px" }}>{new Date(s.startDate).toLocaleDateString("en-IN")}</td>
                        <td style={{ padding: "12px" }}>{new Date(s.endDate).toLocaleDateString("en-IN")}</td>
                        <td style={{ padding: "12px" }}><span style={{ background: s.status === "active" ? "#22c55e22" : "#ef444422", color: s.status === "active" ? "#22c55e" : s.status === "cancelled" ? "#94a3b8" : "#ef4444", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{s.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {subscriptions.length === 0 && <p style={{ color: "#64748b", textAlign: "center", padding: 24 }}>No subscriptions found.</p>}
                {subTotalPages > 1 && (
                  <div style={{ marginTop: "16px" }}>
                    <Pagination
                      page={subPage}
                      totalPages={subTotalPages}
                      onChange={setSubPage}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!report && !loading && (
          <div className="report-empty" style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            <span style={{ fontSize: "40px" }}>📊</span><p>Click "Generate Report" to see platform analytics</p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
