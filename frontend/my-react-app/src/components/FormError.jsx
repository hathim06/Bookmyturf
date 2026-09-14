import './FormError.css';

/**
 * Reusable form error banner.
 * Usage: <FormError message={error} />
 * Renders nothing when message is empty/falsy.
 */
export default function FormError({ message }) {
  if (!message) return null;
  return (
    <div className="formError" role="alert" aria-live="polite">
      <svg
        className="formError__icon"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
