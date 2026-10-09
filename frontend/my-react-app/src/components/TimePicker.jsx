const hours = Array.from({ length: 12 }, (_, index) => String(index + 1));
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

function getTimeParts(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  let hour = Number(match?.[1] ?? 6);
  const minute = match?.[2] ?? "00";
  let period = match?.[3]?.toUpperCase();

  if (!period) period = hour >= 12 ? "PM" : "AM";
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;

  return { hour: String(hour), minute, period };
}

function to24Hour({ hour, minute, period }) {
  let hourNumber = Number(hour);
  if (period === "AM" && hourNumber === 12) hourNumber = 0;
  if (period === "PM" && hourNumber !== 12) hourNumber += 12;
  return `${String(hourNumber).padStart(2, "0")}:${minute}`;
}

/** A locale-independent time picker that always shows an AM/PM selector. */
export default function TimePicker({ value, onChange, ariaLabel }) {
  const parts = getTimeParts(value);
  const update = (key, nextValue) => onChange(to24Hour({ ...parts, [key]: nextValue }));

  return (
    <div className="timePicker" aria-label={ariaLabel}>
      <select value={parts.hour} onChange={(event) => update("hour", event.target.value)} aria-label={`${ariaLabel} hour`}>
        {hours.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
      </select>
      <span>:</span>
      <select value={parts.minute} onChange={(event) => update("minute", event.target.value)} aria-label={`${ariaLabel} minute`}>
        {minutes.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
      </select>
      <select value={parts.period} onChange={(event) => update("period", event.target.value)} aria-label={`${ariaLabel} AM or PM`}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
