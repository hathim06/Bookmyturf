export const offerDateKey = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

export const isOfferValidOnDate = (offer, dateKey) => {
  const from = offerDateKey(offer.validFrom);
  const to = offerDateKey(offer.validTo);
  if (!dateKey || from !== dateKey || to !== dateKey) return false;
  const weekday = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
  return !offer.daysOfWeek?.length || offer.daysOfWeek.includes(weekday);
};

export const utcTodayKey = () => new Date().toISOString().slice(0, 10);
