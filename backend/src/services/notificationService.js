import { EventEmitter } from "node:events";
import notificationModel from "../models/notification.js";

const events = new EventEmitter();
events.setMaxListeners(0);

export const createNotification = async ({ recipient, type, title, message, link = "" }) => {
  const notification = await notificationModel.create({ recipient, type, title, message, link });
  const payload = notification.toObject();
  events.emit(String(recipient), payload);
  return payload;
};

export const subscribeToNotifications = (userId, listener) => {
  events.on(String(userId), listener);
  return () => events.off(String(userId), listener);
};

export const listNotifications = (userId) =>
  notificationModel.find({ recipient: userId }).sort({ createdAt: -1 }).limit(40).lean();

export const markNotificationsRead = (userId, ids) =>
  notificationModel.updateMany(
    { recipient: userId, ...(ids?.length ? { _id: { $in: ids } } : { read: false }) },
    { read: true },
  );
