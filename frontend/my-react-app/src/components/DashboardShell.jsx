import { Link, useLocation, useNavigate } from "react-router-dom";
import { getAuthUser, clearAuthSession } from "../utils/auth";
import { confirmAction } from "../utils/alert";
import NotificationBell from "./NotificationBell";

const menus = {
  owner: [
    "Overview",
    "My Turfs",
    "Offers",
    "Categories",
    "Profile",
    "Bookings",
    "Schedule",
    "Subscription",
    "Reports",
    "Support",
  ],
  admin: [
    "Dashboard",
    "Users",
    "Owners",
    "Turfs",
    "Profile",
    "Bookings",
    "Reports",
    "Support",
  ],
};

export default function DashboardShell({ role, title, subtitle, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getAuthUser() || {};
  const signOut = async () => {
    const confirmed = await confirmAction({
      title: "Log out of panel?",
      text: `Are you sure you want to log out of the ${role} panel?`,
      icon: "question",
      confirmButtonText: "Yes, log out",
      danger: true,
    });
    if (confirmed) {
      clearAuthSession();
      navigate("/login", { replace: true });
    }
  };

  const destinationFor = (item) => {
    if (role === "owner" && item === "Overview") return "/owner/dashboard";
    if (role === "owner" && item === "My Turfs") return "/owner/turfs";
    if (role === "owner" && item === "Offers") return "/owner/offers";
    if (role === "owner" && item === "Categories") return "/owner/categories";
    if (role === "owner" && item === "Profile") return "/owner/profile";
    if (role === "owner" && item === "Bookings") return "/owner/bookings";
    if (role === "owner" && item === "Schedule") return "/owner/schedule";
    if (role === "owner" && item === "Subscription") return "/owner/subscription";
    if (role === "owner" && item === "Reports") return "/owner/reports";
    if (role === "owner" && item === "Support") return "/owner/support";
    if (role !== "admin") return null;
    if (item === "Dashboard") return "/admin/dashboard";
    if (item === "Users") return "/admin/users";
    if (item === "Owners") return "/admin/owners";
    if (item === "Bookings") return "/admin/bookings";
    if (item === "Turfs") return "/admin/turfs";
    if (item === "Profile") return "/admin/profile";
    if (item === "Reports") return "/admin/reports";
    if (item === "Support") return "/admin/support";
    return null;
  };

  return (
    <main className="dashboard">
      <aside className="dashSidebar">
        <Link className="dashBrand" to="/">
          BookMy<span>Turf</span>
          <small>{role} panel</small>
        </Link>
        <nav>
          {menus[role].map((item, index) => {
            const destination = destinationFor(item);
            return (
              <button
                data-confirmation-skip={Boolean(destination)}
                className={
                  destination
                    ? location.pathname === destination
                      ? "dashActive"
                      : ""
                    : index === 0
                      ? "dashActive"
                      : ""
                }
                key={item}
                onClick={() => destination && navigate(destination)}
              >
                <b>{["▪", "♙", "◫", "▣", "◉", "◈", "☆", "◌", "⚙"][index]}</b>
                {item}
              </button>
            );
          })}
        </nav>
        <div className="dashHelp">
          Need help?
          <br />
          <small>Contact support</small>
          <button onClick={signOut}>↪ Log out</button>
        </div>
      </aside>
      <section className="dashMain">
        <header className="dashTop">
          <input placeholder="Search bookings, customers..." />
          <div>
            🔔{" "}
            <NotificationBell />
            <span className="dashAvatar">
              {(user.name || "A").slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <div className="dashHeading">
          <div>
            <p>
              {role === "admin"
                ? "Platform overview and insights"
                : "Here is what is happening with your turfs today"}
            </p>
            <h1>{title}</h1>
            <small>{subtitle}</small>
          </div>
          <button
            data-confirmation-skip={location.pathname === "/admin/owners/new" || role === "owner"}
            className="dashAction"
            onClick={
              location.pathname === "/admin/owners/new"
                ? () => navigate("/admin/dashboard")
                : role === "owner"
                  ? () => navigate("/owner/turfs/new")
                  : undefined
            }
          >
            {location.pathname === "/admin/owners/new"
              ? "Back to dashboard"
              : role === "admin"
                ? "Export report"
                : "+ Add new turf"}
          </button>
        </div>
        {children}
      </section>
    </main>
  );
}
