import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthToken } from "../utils/auth";
import { notificationService } from "../services/notificationService";
import apiClient from "../services/apiClient";

const STREAM_URL = `${apiClient.defaults.baseURL}/notifications/stream`;

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const reconnectTimer = useRef();
  useEffect(() => {
    const controller = new AbortController();
    const headers = { Authorization: `Bearer ${getAuthToken()}` };
    const load = async () => {
      const data = await notificationService.list();
      setNotifications(data.notifications || []);
    };
    const stream = async () => {
      try {
        const response = await fetch(STREAM_URL, {
          headers,
          signal: controller.signal,
        });
        if (!response.ok || !response.body)
          throw new Error("Notification stream unavailable");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";
          events.forEach((event) => {
            const data = event
              .split("\n")
              .find((line) => line.startsWith("data: "));
            if (!data) return;
            try {
              const notification = JSON.parse(data.slice(6));
              setNotifications((current) =>
                [notification, ...current].slice(0, 40),
              );
              if (
                "Notification" in window &&
                Notification.permission === "granted"
              )
                new Notification(notification.title, {
                  body: notification.message,
                });
            } catch {
            }
          });
        }
      } catch {
        if (!controller.signal.aborted)
          reconnectTimer.current = window.setTimeout(stream, 5000);
      }
    };
    load().catch(() => {});
    stream();
    return () => {
      controller.abort();
      window.clearTimeout(reconnectTimer.current);
    };
  }, []);
  const unread = notifications.filter((item) => !item.read).length;
  const toggle = () => {
    if ("Notification" in window && Notification.permission === "default")
      Notification.requestPermission().catch(() => {});
    setOpen((value) => !value);
    if (!open && unread) {
      setNotifications((items) =>
        items.map((item) => ({ ...item, read: true })),
      );
      notificationService.markRead().catch(() => {});
    }
  };
  return (
    <div className="notificationMenu">
      <button
        className="notificationBell"
        type="button"
        onClick={toggle}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        🔔{unread > 0 && <b>{unread > 9 ? "9+" : unread}</b>}
      </button>
      {open && (
        <section className="notificationPanel">
          <header>
            <strong>Notifications</strong>
            <small>
              {notifications.length ? "Latest updates" : "You're all caught up"}
            </small>
          </header>
          {notifications.length ? (
            notifications.map((notification) => (
              <button
                className="notificationItem"
                type="button"
                key={notification._id}
                onClick={() => {
                  setOpen(false);
                  if (notification.link) navigate(notification.link);
                }}
              >
                <b>{notification.title}</b>
                <span>{notification.message}</span>
                <small>
                  {new Date(notification.createdAt).toLocaleString()}
                </small>
              </button>
            ))
          ) : (
            <p>No notifications yet.</p>
          )}
        </section>
      )}
    </div>
  );
}
