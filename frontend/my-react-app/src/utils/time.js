export const formatTime = (value) => {
  const [hours = 0, minutes = 0] = String(value || "").split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const formatTimeRange = (startTime, endTime) =>
  `${formatTime(startTime)} – ${formatTime(endTime)}`;

export const todayKey = () => new Date().toLocaleDateString("en-CA");

export const isPastSlot = (date, endTime) => {
  if (date !== todayKey()) return false;
  const [hours, minutes] = String(endTime).split(":").map(Number);
  const endsAt = new Date();
  endsAt.setHours(hours, minutes, 0, 0);
  return endsAt <= new Date();
};
