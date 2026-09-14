import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../../components/DashboardShell";
import Pagination from "../../components/Pagination";
import { getAuthToken } from "../../utils/auth";

const API_URL = "http://localhost:5000/api/owner/bookings";
const dayKey = (date) => date.toISOString().slice(0, 10);
const startOfWeek = (date) => {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(0, 0, 0, 0);
  return result;
};
const formatDay = (date) =>
  new Intl.DateTimeFormat("en", { weekday: "short" }).format(date);
const formatDate = (date) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    date,
  );

export default function Schedule() {
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dayKey(new Date()));
  const [weekDate, setWeekDate] = useState(startOfWeek(new Date()));
  const [selectedTurf, setSelectedTurf] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    async function loadBookings() {
      try {
        const response = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "Unable to load schedule.");
        setBookings(data);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }
    loadBookings();
  }, []);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekDate);
        date.setDate(weekDate.getDate() + index);
        return date;
      }),
    [weekDate],
  );

  const turfs = useMemo(
    () =>
      Array.from(
        new Map(
          bookings
            .filter((booking) => booking.turf?._id)
            .map((booking) => [booking.turf._id, booking.turf.name]),
        ).entries(),
      ),
    [bookings],
  );
  const visibleBookings = bookings
    .filter((booking) => {
      const matchesDate = dayKey(new Date(booking.date)) === selectedDate;
      const matchesTurf =
        selectedTurf === "all" || booking.turf?._id === selectedTurf;
      return matchesDate && matchesTurf;
    })
    .sort((first, second) => first.startTime.localeCompare(second.startTime));
  const selectedLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
    "en",
    { weekday: "long", month: "long", day: "numeric" },
  );
  const totalPages = Math.max(1, Math.ceil(visibleBookings.length / pageSize));
  const paginatedBookings = visibleBookings.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const moveWeek = (offset) => {
    const next = new Date(weekDate);
    next.setDate(next.getDate() + offset * 7);
    setWeekDate(next);
    setSelectedDate(dayKey(next));
  };

  return (
    <DashboardShell
      role="owner"
      title="Schedule"
      subtitle="Keep track of every booking across your turfs"
    >
      <section className="schedulePage">
        <div className="scheduleToolbar">
          <div>
            <h2>Booking calendar</h2>
            <p>View reservations by day and venue.</p>
          </div>
          <div className="scheduleActions">
            <button
              onClick={() => {
                const today = new Date();
                setWeekDate(startOfWeek(today));
                setSelectedDate(dayKey(today));
              }}
            >
              Today
            </button>
            <select
              value={selectedTurf}
              onChange={(event) => setSelectedTurf(event.target.value)}
            >
              <option value="all">All turfs</option>
              {turfs.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="scheduleWeekNav">
          <button aria-label="Previous week" onClick={() => moveWeek(-1)}>
            ←
          </button>
          <strong>
            {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
          </strong>
          <button aria-label="Next week" onClick={() => moveWeek(1)}>
            →
          </button>
        </div>
        <div className="scheduleDays">
          {weekDays.map((date) => {
            const key = dayKey(date);
            const count = bookings.filter(
              (booking) => dayKey(new Date(booking.date)) === key,
            ).length;
            return (
              <button
                key={key}
                className={
                  selectedDate === key ? "scheduleDay active" : "scheduleDay"
                }
                onClick={() => setSelectedDate(key)}
              >
                <span>{formatDay(date)}</span>
                <b>{date.getDate()}</b>
                {count > 0 && (
                  <small>
                    {count} booking{count === 1 ? "" : "s"}
                  </small>
                )}
              </button>
            );
          })}
        </div>
        <div className="scheduleSummary">
          <span>
            <b>{visibleBookings.length}</b> booking
            {visibleBookings.length === 1 ? "" : "s"} on {selectedLabel}
          </span>
          <span>
            <b>
              {
                visibleBookings.filter(
                  (booking) => booking.status === "confirmed",
                ).length
              }
            </b>{" "}
            confirmed
          </span>
          <span>
            <b>
              {
                visibleBookings.filter(
                  (booking) => booking.status === "cancelled",
                ).length
              }
            </b>{" "}
            cancelled
          </span>
        </div>
        {error && <p className="authError">{error}</p>}
        {loading ? (
          <p className="scheduleEmpty">Loading schedule...</p>
        ) : visibleBookings.length === 0 ? (
          <div className="scheduleEmpty">
            <strong>No bookings for this day</strong>
            <span>
              Reservations will appear here when customers book one of your
              turfs.
            </span>
          </div>
        ) : (
          <>
            <div className="scheduleList">
              {paginatedBookings.map((booking) => (
                <article
                  className={`scheduleBooking ${booking.status}`}
                  key={booking._id}
                >
                  <div className="scheduleTime">
                    <strong>{booking.startTime}</strong>
                    <span>{booking.endTime}</span>
                  </div>
                  <div className="scheduleBookingInfo">
                    <h3>{booking.turf?.name || "Turf unavailable"}</h3>
                    <p>
                      {booking.user?.name || "Customer"} ·{" "}
                      {booking.user?.phone ||
                        booking.user?.email ||
                        "Contact unavailable"}
                    </p>
                    <small>
                      {booking.sport || "Multi-sport"} · ₹{booking.amount}
                    </small>
                  </div>
                  <em>{booking.status}</em>
                </article>
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
