import { useCallback, useEffect, useState } from "react";
import { Page } from "../components/Layout";
import DashboardShell from "../components/DashboardShell";
import { getAuthUser } from "../utils/auth";
import { supportService } from "../services/supportService";

const PAGE_SIZE = 10;

/* ── small helpers ── */
function fmtDate(d) {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  if (diffDays === 0)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function fmtFull(d) {
  if (!d) return "";
  return new Date(d).toLocaleString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Avatar({ name, size = 36 }) {
  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";
  const colors = [
    "#16a34a",
    "#0ea5e9",
    "#8b5cf6",
    "#f59e0b",
    "#ef4444",
    "#14b8a6",
  ];
  const color = colors[initials.charCodeAt(0) % colors.length];
  return (
    <span
      className="spAvatar"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </span>
  );
}

/* ── New Ticket Modal ── */
function NewTicketModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    kind: "support",
    subject: "",
    message: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      setError("Please fill in both the subject and message.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err.message || "Unable to submit.");
      setLoading(false);
    }
  };

  return (
    <div className="spModalBackdrop" onClick={onClose}>
      <div className="spModal" onClick={(e) => e.stopPropagation()}>
        <div className="spModalHeader">
          <h2>New Support Request</h2>
          <button className="spModalClose" onClick={onClose}>
            ✕
          </button>
        </div>
        <form className="spModalForm" onSubmit={handleSubmit}>
          {error && <p className="spModalError">⚠ {error}</p>}
          <div className="spModalField">
            <label>Request Type</label>
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
            >
              <option value="support">💬 Support</option>
              <option value="complaint">⚠ Complaint</option>
            </select>
          </div>
          <div className="spModalField">
            <label>Subject</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Brief summary of your issue"
              maxLength={120}
              autoFocus
            />
          </div>
          <div className="spModalField">
            <label>Message</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Describe your issue in detail..."
              rows={6}
              maxLength={2000}
            />
          </div>
          <div className="spModalActions">
            <button type="button" className="spModalCancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="spModalSubmit" disabled={loading}>
              {loading ? "Sending..." : "Send Request ↗"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Thread view (right panel) ── */
function ThreadView({ ticket, isStaff, onReply, onStatusChange, onBack }) {
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    setError("");
    try {
      await onReply(ticket._id, replyText);
      setReplyText("");
    } catch (err) {
      setError(err.message || "Unable to send reply.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="spThread">
      {/* Thread header */}
      <div className="spThreadHeader">
        <button className="spThreadBack" onClick={onBack}>
          ← Back
        </button>
        <div className="spThreadHeaderMain">
          <div className="spThreadSubjectRow">
            <h2 className="spThreadSubject">{ticket.subject}</h2>
            <div className="spThreadHeaderActions">
              <span className={`spInboxBadge spInboxBadge--${ticket.kind}`}>
                {ticket.kind === "complaint" ? "⚠ Complaint" : "💬 Support"}
              </span>
              {isStaff ? (
                <button
                  className={`spStatusBtn spStatusBtn--${ticket.status}`}
                  onClick={() =>
                    onStatusChange(
                      ticket,
                      ticket.status === "open" ? "resolved" : "open",
                    )
                  }
                >
                  {ticket.status === "open" ? "Mark Resolved ✓" : "Reopen ↺"}
                </button>
              ) : (
                <span
                  className={`spStatusBadge spStatusBadge--${ticket.status}`}
                >
                  <span className="spStatusDot" />
                  {ticket.status === "open" ? "Open" : "Resolved"}
                </span>
              )}
            </div>
          </div>
          {isStaff && ticket.createdBy && (
            <p className="spThreadFrom">
              From <strong>{ticket.createdBy.name}</strong>
              {ticket.createdBy.email && (
                <>
                  {" "}
                  ·{" "}
                  <a href={`mailto:${ticket.createdBy.email}`}>
                    {ticket.createdBy.email}
                  </a>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="spMessages">
        {/* Original message */}
        <div className="spMessage">
          <div className="spMessageMeta">
            <Avatar name={ticket.createdBy?.name || "User"} />
            <div>
              <strong>{ticket.createdBy?.name || "User"}</strong>
              <time>{fmtFull(ticket.createdAt)}</time>
            </div>
          </div>
          <div className="spMessageBody">
            <p>{ticket.message}</p>
          </div>
        </div>

        {/* Replies */}
        {ticket.replies?.map((reply, i) => (
          <div key={reply._id || i} className="spMessage spMessage--reply">
            <div className="spMessageMeta">
              <Avatar name={reply.author?.name || "Support"} />
              <div>
                <strong>{reply.author?.name || "Support Team"}</strong>
                <span className="spReplyRole">
                  {reply.author?.role === "admin"
                    ? "Admin"
                    : reply.author?.role === "owner"
                      ? "Owner"
                      : "Support"}
                </span>
                <time>{fmtFull(reply.createdAt)}</time>
              </div>
            </div>
            <div className="spMessageBody spMessageBody--reply">
              <p>{reply.message}</p>
            </div>
          </div>
        ))}

        {/* Resolved banner */}
        {ticket.status === "resolved" && (
          <div className="spResolvedBar">✅ This ticket has been resolved.</div>
        )}

        {/* Reply composer — staff only, open tickets only */}
        {isStaff && ticket.status === "open" && (
          <div className="spComposer">
            <div className="spComposerHeader">
              Reply to {ticket.createdBy?.name || "customer"}
            </div>
            {error && <p className="spComposerError">⚠ {error}</p>}
            <textarea
              className="spComposerInput"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply... (an email will be sent to the user)"
              rows={4}
            />
            <div className="spComposerFooter">
              <span className="spComposerHint">
                📧 The user will receive this reply via email
              </span>
              <button
                className="spComposerSend"
                onClick={handleReply}
                disabled={sending || !replyText.trim()}
              >
                {sending ? "Sending..." : "Send Reply ↗"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Support page ── */
export default function Support() {
  const user = getAuthUser();
  const isStaff = ["owner", "admin"].includes(user?.role);

  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const data = await supportService.list({ page: p, limit: PAGE_SIZE });
      setTickets(data.tickets || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [load, page]);

  /* keep selected ticket in sync after replies/status changes */
  useEffect(() => {
    if (selected) {
      const fresh = tickets.find((t) => t._id === selected._id);
      if (fresh) setSelected(fresh);
    }
  }, [tickets]);

  const handleCreate = async (form) => {
    const data = await supportService.create(form);
    setTickets((prev) => [data.ticket, ...prev]);
    setSelected(data.ticket);
  };

  const handleReply = async (id, message) => {
    const data = await supportService.reply(id, message);
    setTickets((prev) => prev.map((t) => (t._id === id ? data.ticket : t)));
    setSelected(data.ticket);
  };

  const handleStatusChange = async (ticket, status) => {
    const data = await supportService.updateStatus(ticket._id, status);
    setTickets((prev) =>
      prev.map((t) => (t._id === ticket._id ? data.ticket : t)),
    );
    setSelected(data.ticket);
  };

  const filtered =
    filter === "all" ? tickets : tickets.filter((t) => t.status === filter);
  const openCount = tickets.filter((t) => t.status === "open").length;

  const content = (
    <div className="spInbox">
      {/* ── Left panel: inbox list ── */}
      <div className={`spInboxPanel${selected ? " spInboxPanel--hidden" : ""}`}>
        <div className="spInboxTop">
          <div className="spInboxTopLeft">
            <h1 className="spInboxTitle">
              {isStaff ? "Support Inbox" : "My Requests"}
              {openCount > 0 && (
                <span className="spInboxBadgeCount">{openCount}</span>
              )}
            </h1>
          </div>
          {!isStaff && (
            <button className="spNewBtn" onClick={() => setShowNewModal(true)}>
              ✏ New Request
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="spInboxFilters">
          {["all", "open", "resolved"].map((f) => (
            <button
              key={f}
              className={`spInboxFilter${filter === f ? " spInboxFilter--active" : ""}`}
              onClick={() => {
                setFilter(f);
                setSelected(null);
              }}
            >
              {f === "all" ? "All" : f === "open" ? "Open" : "Resolved"}
            </button>
          ))}
        </div>

        {error && <div className="spInboxError">⚠ {error}</div>}

        {/* Ticket list */}
        <div className="spInboxList">
          {loading ? (
            <div className="spInboxLoading">
              <div className="spSpinner" />
              <p>Loading...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="spInboxEmpty">
              <span>{isStaff ? "📭" : "📝"}</span>
              <p>
                {filter === "all" ? "No tickets yet." : `No ${filter} tickets.`}
              </p>
              {!isStaff && filter === "all" && (
                <button
                  className="spNewBtn"
                  onClick={() => setShowNewModal(true)}
                >
                  Create your first request
                </button>
              )}
            </div>
          ) : (
            filtered.map((ticket) => {
              const isSelected = selected?._id === ticket._id;
              const isUnread =
                ticket.status === "open" && ticket.replies?.length === 0;
              return (
                <button
                  key={ticket._id}
                  className={`spInboxRow${isSelected ? " spInboxRow--active" : ""}${isUnread ? " spInboxRow--unread" : ""}`}
                  onClick={() => setSelected(ticket)}
                >
                  <Avatar name={ticket.createdBy?.name || "User"} size={40} />
                  <div className="spInboxRowContent">
                    <div className="spInboxRowTop">
                      <span className="spInboxRowName">
                        {isStaff ? ticket.createdBy?.name || "Customer" : "Me"}
                      </span>
                      <time className="spInboxRowTime">
                        {fmtDate(ticket.updatedAt || ticket.createdAt)}
                      </time>
                    </div>
                    <p className="spInboxRowSubject">{ticket.subject}</p>
                    <p className="spInboxRowPreview">
                      {ticket.replies?.length
                        ? `${ticket.replies[ticket.replies.length - 1].author?.name || "Support"}: ${ticket.replies[ticket.replies.length - 1].message}`
                        : ticket.message}
                    </p>
                  </div>
                  <div className="spInboxRowMeta">
                    <span
                      className={`spInboxBadge spInboxBadge--${ticket.kind}`}
                    >
                      {ticket.kind === "complaint" ? "⚠" : "💬"}
                    </span>
                    <span
                      className={`spInboxDot spInboxDot--${ticket.status}`}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="spInboxPagination">
            <button
              className="spPageBtn"
              disabled={page === 1}
              onClick={() => {
                setPage((p) => p - 1);
                setSelected(null);
              }}
            >
              ← Prev
            </button>
            <span className="spPageInfo">
              {page} / {totalPages}
            </span>
            <button
              className="spPageBtn"
              disabled={page === totalPages}
              onClick={() => {
                setPage((p) => p + 1);
                setSelected(null);
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── Right panel: thread view ── */}
      <div
        className={`spThreadPanel${!selected ? " spThreadPanel--empty" : ""}`}
      >
        {selected ? (
          <ThreadView
            ticket={selected}
            isStaff={isStaff}
            onReply={handleReply}
            onStatusChange={handleStatusChange}
            onBack={() => setSelected(null)}
          />
        ) : (
          <div className="spThreadEmpty">
            <span>✉️</span>
            <p>Select a ticket to read the conversation</p>
          </div>
        )}
      </div>

      {/* New ticket modal */}
      {showNewModal && (
        <NewTicketModal
          onClose={() => setShowNewModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );

  return isStaff ? (
    <DashboardShell
      role={user.role}
      title="Support"
      subtitle="Customer messages and complaints"
    >
      {content}
    </DashboardShell>
  ) : (
    <Page>{content}</Page>
  );
}
