import { Link, useLocation } from "react-router-dom";

const labels = {
  turfs: "Find Turfs",
  favorites: "Favorites",
  bookings: "My Bookings",
  checkout: "Checkout",
  profile: "Profile",
  login: "Log in",
  signup: "Sign up",
};

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  if (!parts.length || pathname.startsWith("/payment")) return null;

  const items = [{ label: "Home", path: "/" }];
  parts.forEach((part, index) => {
    items.push({
      label: labels[part] || (part.length > 18 ? "Details" : part),
      path: `/${parts.slice(0, index + 1).join("/")}`,
    });
  });

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumbs">
      {items.map((item, index) => (
        <span key={item.path}>
          {index > 0 && <b>/</b>}
          {index === items.length - 1 ? (
            <strong>{item.label}</strong>
          ) : (
            <Link to={item.path}>{item.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
