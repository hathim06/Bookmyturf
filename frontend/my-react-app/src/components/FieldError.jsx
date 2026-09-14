/**
 * Reusable inline field-level error shown directly below a form label.
 * Usage: <FieldError message={errors.email} />
 * Renders nothing when message is empty/falsy.
 */
export default function FieldError({ message }) {
  if (!message) return null;
  return (
    <span
      className="fieldError"
      role="alert"
      style={{
        display: "block",
        color: "#ef4444",
        fontSize: "0.78rem",
        fontWeight: "500",
        marginTop: "4px",
        paddingLeft: "2px",
        animation: "slideIn 0.15s ease",
      }}
    >
      {message}
    </span>
  );
}
