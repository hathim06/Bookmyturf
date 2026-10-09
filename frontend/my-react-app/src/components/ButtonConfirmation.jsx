/**
 * Normal actions should be immediate. Destructive actions opt into their own
 * confirmation at the point where they are defined.
 */
export default function ButtonConfirmation({ children }) {
  return children;
}
