import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BusIcon,
  GridIcon,
  TicketIcon,
  ClockIcon,
  MapPinIcon,
  GiftIcon,
  UserIcon,
  LogoutIcon,
  MenuIcon,
  CloseIcon,
} from "./Icons.jsx";
import AppTopBar from "./AppTopBar.jsx";
import "./DashboardLayout.css";

const MAIN_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: GridIcon },
  { to: "/my-tickets", label: "My Tickets", icon: TicketIcon },
  { to: "/trip-history", label: "Trip History", icon: ClockIcon },
  { to: "/track-bus", label: "Track Bus", icon: MapPinIcon },
  { to: "/rewards", label: "Rewards", icon: GiftIcon },
];

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // No real auth yet -- "logging out" just sends the passenger back
  // to the public landing page, the same way it will once a real
  // session/token is being cleared.
  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="dashboard-layout">
      <aside className={`dashboard-sidebar ${sidebarOpen ? "dashboard-sidebar--open" : ""}`}>
        <button
          className="dashboard-sidebar__close"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        >
          <CloseIcon />
        </button>

        <div className="dashboard-sidebar__logo">
          <BusIcon size={28} />
          <span>SmartTransit</span>
        </div>

        <p className="dashboard-sidebar__section">MAIN</p>
        <nav className="dashboard-sidebar__nav">
          {MAIN_LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `dashboard-sidebar__link ${isActive ? "dashboard-sidebar__link--active" : ""}`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="dashboard-sidebar__bottom">
          <NavLink to="/profile" className="dashboard-sidebar__link">
            <UserIcon size={18} />
            Profile
          </NavLink>
          <button className="dashboard-sidebar__link dashboard-sidebar__logout" onClick={handleLogout}>
            <LogoutIcon size={18} />
            Logout
          </button>
        </div>
      </aside>

      <div className="dashboard-content">
        <div className="dashboard-mobile-bar">
          <button
            className="dashboard-mobile-bar__menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
        </div>
        <AppTopBar />
        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
