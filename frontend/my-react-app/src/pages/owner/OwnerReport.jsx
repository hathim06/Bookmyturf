import { useEffect, useState, useRef } from "react";
import DashboardShell from "../../components/DashboardShell";
import Pagination from "../../components/Pagination";
import { subscriptionService } from "../../services/subscriptionService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const STATUS_COLORS = {
  confirmed: "#22c55e",
  completed: "#0ea5e9",
  cancelled: "#ef4444",
  pending: "#f59e0b",
};
const THEME_COLOR = "#16a34a"; // Green theme

export default function OwnerReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tab, setTab] = useState("summary");

  const [bookingPage, setBookingPage] = useState(1);
  const [turfPage, setTurfPage] = useState(1);

  const tableRef = useRef(null);
  const reportRequestId = useRef(0);

  const fetchReport = async () => {
    const requestId = ++reportRequestId.current;
    setLoading(true);
    try {
      const params = { page: bookingPage, limit: 10 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const data = await subscriptionService.getOwnerReport(params);
      if (requestId === reportRequestId.current) setReport(data);
    } catch {
      if (requestId === reportRequestId.current) setReport(null);
    } finally {
      if (requestId === reportRequestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [bookingPage, startDate, endDate]);

  const downloadPDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString("en-IN");

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(22, 163, 74); // Green header text
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("BookMyTurf", 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Owner Revenue Report", 14, 27);
    doc.text(`Generated: ${now}`, 14, 34);
    if (startDate || endDate)
      doc.text(`Period: ${startDate || "All"} → ${endDate || "All"}`, 100, 34);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 14, 52);

    autoTable(doc, {
      startY: 57,
      head: [["Metric", "Value"]],
      body: [
        ["Total Bookings", report.summary.totalBookings],
        ["Confirmed", report.summary.confirmed],
        ["Cancelled", report.summary.cancelled],
        ["Pending", report.summary.pending],
        [
          "Total Revenue",
          `₹${report.summary.totalRevenue.toLocaleString("en-IN")}`,
        ],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [22, 163, 74],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    if (report.turfBreakdown.length) {
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Turf Breakdown", 14, doc.lastAutoTable.finalY + 14);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 19,
        head: [["Turf Name", "Bookings", "Revenue"]],
        body: report.turfBreakdown.map((t) => [
          t.name,
          t.bookings,
          `₹${t.revenue.toLocaleString("en-IN")}`,
        ]),
        theme: "grid",
        headStyles: {
          fillColor: [22, 163, 74],
          textColor: 255,
          fontStyle: "bold",
        },
      });
    }

    if (report.bookings.length) {
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(
        "Booking Details (Current Page)",
        14,
        doc.lastAutoTable.finalY + 14,
      );
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 19,
        head: [["Customer", "Turf", "Date", "Time", "Amount", "Status"]],
        body: report.bookings.map((b) => [
          b.user?.name || "N/A",
          b.turf?.name || "N/A",
          new Date(b.date).toLocaleDateString("en-IN"),
          `${b.startTime} - ${b.endTime}`,
          `₹${b.amount}`,
          b.status,
        ]),
        theme: "striped",
        headStyles: { fillColor: [22, 163, 74], textColor: 255 },
        styles: { fontSize: 8 },
      });
    }

    doc.save(`owner-report-${now.replace(/\//g, "-")}.pdf`);
  };

  const downloadExcel = () => {
    if (!report) return;
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ["Metric", "Value"],
      ["Total Bookings", report.summary.totalBookings],
      ["Confirmed", report.summary.confirmed],
      ["Cancelled", report.summary.cancelled],
      ["Pending", report.summary.pending],
      ["Total Revenue (₹)", report.summary.totalRevenue],
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(summaryData),
      "Summary",
    );

    // Monthly sheet
    if (report.monthly.length) {
      const monthlyData = [
        ["Month", "Revenue (₹)"],
        ...report.monthly.map((m) => [m.month, m.revenue]),
      ];
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(monthlyData),
        "Monthly Revenue",
      );
    }

    // Turf sheet
    if (report.turfBreakdown.length) {
      const turfData = [
        ["Turf Name", "Bookings", "Revenue (₹)"],
        ...report.turfBreakdown.map((t) => [t.name, t.bookings, t.revenue]),
      ];
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(turfData),
        "Turf Breakdown",
      );
    }

    // Bookings sheet (current page)
    if (report.bookings.length) {
      const bookingsData = [
        [
          "Customer Name",
          "Customer Email",
          "Customer Phone",
          "Turf",
          "Date",
          "Start Time",
          "End Time",
          "Amount (₹)",
          "Status",
        ],
        ...report.bookings.map((b) => [
          b.user?.name || "N/A",
          b.user?.email || "N/A",
          b.user?.phone || "N/A",
          b.turf?.name || "N/A",
          new Date(b.date).toLocaleDateString("en-IN"),
          b.startTime,
          b.endTime,
          b.amount,
          b.status,
        ]),
      ];
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(bookingsData),
        "Bookings",
      );
    }

    XLSX.writeFile(
      wb,
      `owner-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const statCards = report
    ? [
        {
          label: "Total Bookings",
          value: report.summary.totalBookings,
          icon: "📋",
          color: THEME_COLOR,
        },
        {
          label: "Confirmed",
          value: report.summary.confirmed,
          icon: "✅",
          color: "#22c55e",
        },
        {
          label: "Cancelled",
          value: report.summary.cancelled,
          icon: "❌",
          color: "#ef4444",
        },
        {
          label: "Total Revenue",
          value: `₹${report.summary.totalRevenue.toLocaleString("en-IN")}`,
          icon: "💰",
          color: THEME_COLOR,
        },
      ]
    : [];

  const turfsPerPage = 10;
  const paginatedTurfs =
    report?.turfBreakdown.slice(
      (turfPage - 1) * turfsPerPage,
      turfPage * turfsPerPage,
    ) || [];
  const totalTurfPages = Math.ceil(
    (report?.turfBreakdown.length || 0) / turfsPerPage,
  );

  return (
    <DashboardShell
      role="owner"
      title="Reports"
      subtitle="Download and analyze your turf performance"
    >
      <div
        className="report-wrap"
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          color: "#1e293b",
        }}
      >
        {/* Filters */}
        <div
          className="report-filters"
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "20px",
            flexWrap: "wrap",
            alignItems: "flex-end",
          }}
        >
          <div
            className="report-filter-group"
            style={{ display: "flex", flexDirection: "column", gap: "5px" }}
          >
            <label
              style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b" }}
            >
              From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setBookingPage(1);
              }}
              style={{
                padding: "8px",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                outline: "none",
              }}
            />
          </div>
          <div
            className="report-filter-group"
            style={{ display: "flex", flexDirection: "column", gap: "5px" }}
          >
            <label
              style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b" }}
            >
              To
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setBookingPage(1);
              }}
              style={{
                padding: "8px",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                outline: "none",
              }}
            />
          </div>
          <button
            className="report-fetch-btn"
            onClick={() => fetchReport()}
            disabled={loading}
            style={{
              background: THEME_COLOR,
              color: "white",
              padding: "9px 16px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {loading ? "Loading…" : "🔍 Generate Report"}
          </button>
          {report && (
            <>
              <button
                className="report-dl-pdf"
                onClick={downloadPDF}
                style={{
                  background: "#334155",
                  color: "white",
                  padding: "9px 16px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                ⬇ PDF
              </button>
              <button
                className="report-dl-excel"
                onClick={downloadExcel}
                style={{
                  background: "#334155",
                  color: "white",
                  padding: "9px 16px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                ⬇ Excel
              </button>
            </>
          )}
        </div>

        {loading && (
          <div
            className="report-loading"
            style={{ padding: "40px", textAlign: "center", color: "#64748b" }}
          >
            <p>Generating report…</p>
          </div>
        )}

        {report && !loading && (
          <>
            {/* Stat cards */}
            <div
              className="report-stats-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
                marginBottom: "30px",
              }}
            >
              {statCards.map((s) => (
                <div
                  key={s.label}
                  className="report-stat-card"
                  style={{
                    border: `1px solid ${s.color}44`,
                    padding: "16px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    background: "#f8fafc",
                  }}
                >
                  <span
                    className="report-stat-icon"
                    style={{
                      background: `${s.color}22`,
                      color: s.color,
                      width: "40px",
                      height: "40px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "8px",
                      fontSize: "20px",
                    }}
                  >
                    {s.icon}
                  </span>
                  <div>
                    <p
                      className="report-stat-label"
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: "#64748b",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                      }}
                    >
                      {s.label}
                    </p>
                    <h3
                      className="report-stat-value"
                      style={{
                        margin: 0,
                        color: s.color,
                        fontSize: "20px",
                        fontWeight: "800",
                      }}
                    >
                      {s.value}
                    </h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div
              className="sub-tabs"
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "20px",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "10px",
              }}
            >
              <button
                style={{
                  background: tab === "summary" ? THEME_COLOR : "transparent",
                  color: tab === "summary" ? "white" : "#64748b",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
                onClick={() => setTab("summary")}
              >
                📊 Summary
              </button>
              <button
                style={{
                  background: tab === "turfs" ? THEME_COLOR : "transparent",
                  color: tab === "turfs" ? "white" : "#64748b",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
                onClick={() => setTab("turfs")}
              >
                🏟 Turfs
              </button>
              <button
                style={{
                  background: tab === "bookings" ? THEME_COLOR : "transparent",
                  color: tab === "bookings" ? "white" : "#64748b",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
                onClick={() => setTab("bookings")}
              >
                📋 Bookings
              </button>
            </div>

            {tab === "summary" && (
              <div className="report-monthly">
                <h3 style={{ color: "#0f172a", marginBottom: "20px" }}>
                  Monthly Revenue
                </h3>
                {report.monthly.length === 0 ? (
                  <p style={{ color: "#64748b" }}>
                    No revenue data for selected period.
                  </p>
                ) : (
                  <div
                    style={{
                      height: 300,
                      width: "100%",
                      background: "#f8fafc",
                      padding: "20px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={report.monthly.map((m) => ({
                          name: m.month.slice(5),
                          revenue: m.revenue,
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <XAxis
                          dataKey="name"
                          stroke="#64748b"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#64748b"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => `₹${val}`}
                        />
                        <Tooltip
                          cursor={{ fill: "#e2e8f0" }}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                          }}
                          formatter={(val) => [`₹${val}`, "Revenue"]}
                        />
                        <Bar
                          dataKey="revenue"
                          fill={THEME_COLOR}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {tab === "turfs" && (
              <div
                className="report-table-wrap"
                style={{
                  background: "#f8fafc",
                  padding: "16px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <h3 style={{ color: "#0f172a", margin: "0 0 16px" }}>
                  Turf Breakdown
                </h3>
                <table
                  className="report-table"
                  ref={tableRef}
                  style={{ width: "100%", borderCollapse: "collapse" }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "2px solid #e2e8f0",
                        textAlign: "left",
                      }}
                    >
                      <th style={{ padding: "12px", color: "#475569" }}>
                        Turf Name
                      </th>
                      <th style={{ padding: "12px", color: "#475569" }}>
                        Bookings
                      </th>
                      <th style={{ padding: "12px", color: "#475569" }}>
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTurfs.map((t) => (
                      <tr
                        key={t.name}
                        style={{ borderBottom: "1px solid #e2e8f0" }}
                      >
                        <td style={{ padding: "12px" }}>
                          <strong>{t.name}</strong>
                        </td>
                        <td style={{ padding: "12px" }}>{t.bookings}</td>
                        <td
                          style={{
                            padding: "12px",
                            color: THEME_COLOR,
                            fontWeight: 700,
                          }}
                        >
                          ₹{t.revenue.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalTurfPages > 1 && (
                  <div style={{ marginTop: "16px" }}>
                    <Pagination
                      page={turfPage}
                      totalPages={totalTurfPages}
                      onChange={setTurfPage}
                    />
                  </div>
                )}
              </div>
            )}

            {tab === "bookings" && (
              <div
                className="report-table-wrap"
                style={{
                  background: "#f8fafc",
                  padding: "16px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <h3 style={{ color: "#0f172a", margin: "0 0 16px" }}>
                  All Bookings
                </h3>
                <table
                  className="report-table"
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "14px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: "2px solid #e2e8f0",
                        textAlign: "left",
                      }}
                    >
                      <th style={{ padding: "12px", color: "#475569" }}>
                        Customer
                      </th>
                      <th style={{ padding: "12px", color: "#475569" }}>
                        Turf
                      </th>
                      <th style={{ padding: "12px", color: "#475569" }}>
                        Date
                      </th>
                      <th style={{ padding: "12px", color: "#475569" }}>
                        Time
                      </th>
                      <th style={{ padding: "12px", color: "#475569" }}>
                        Amount
                      </th>
                      <th style={{ padding: "12px", color: "#475569" }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.bookings.map((b) => (
                      <tr
                        key={b._id}
                        style={{ borderBottom: "1px solid #e2e8f0" }}
                      >
                        <td style={{ padding: "12px" }}>
                          <div style={{ fontWeight: 600 }}>
                            {b.user?.name || "N/A"}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            {b.user?.email}
                          </div>
                        </td>
                        <td style={{ padding: "12px" }}>
                          {b.turf?.name || "N/A"}
                        </td>
                        <td style={{ padding: "12px" }}>
                          {new Date(b.date).toLocaleDateString("en-IN")}
                        </td>
                        <td style={{ padding: "12px", whiteSpace: "nowrap" }}>
                          {b.startTime} – {b.endTime}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            fontWeight: 700,
                            color: THEME_COLOR,
                          }}
                        >
                          ₹{b.amount}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              background: `${STATUS_COLORS[b.status] || "#64748b"}22`,
                              color: STATUS_COLORS[b.status] || "#64748b",
                              padding: "2px 10px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {report.bookings.length === 0 && (
                  <p
                    style={{
                      color: "#64748b",
                      textAlign: "center",
                      padding: 24,
                    }}
                  >
                    No bookings found.
                  </p>
                )}

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
          </>
        )}

        {!report && !loading && (
          <div
            className="report-empty"
            style={{ padding: "40px", textAlign: "center", color: "#64748b" }}
          >
            <span style={{ fontSize: "40px" }}>📊</span>
            <p>Click "Generate Report" to see your analytics</p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
