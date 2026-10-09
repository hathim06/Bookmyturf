import { listNotifications, markNotificationsRead, subscribeToNotifications } from "../services/notificationService.js";

export const list = async (req, res) => {
  try {
    const notifications = await listNotifications(req.user._id);
    res.json({ notifications, unreadCount: notifications.filter((item) => !item.read).length });
  } catch {
    res.status(500).json({ message: "Unable to load notifications." });
  }
};

export const markRead = async (req, res) => {
  await markNotificationsRead(req.user._id, req.body?.ids);
  res.json({ success: true });
};

export const stream = (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  res.write("retry: 5000\n\n");
  const listener = (notification) => res.write(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`);
  const unsubscribe = subscribeToNotifications(req.user._id, listener);
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25000);
  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
};
