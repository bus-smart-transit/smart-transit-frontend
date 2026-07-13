import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BusIcon, BellIcon, ArrowLeftIcon, CoinIcon } from "./Icons.jsx";
import { REWARDS_POINTS, NOTIFICATIONS } from "../data/sampleData.js";
import "./AppTopBar.css";

// Shared header for logged-in pages. `backTo` is optional -- when set,
// a "Back" link appears on the left (used on the booking flow steps).
export default function AppTopBar({ backTo, backLabel = "Back" }) {
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadCount = NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <header className="app-topbar">
      <div className="app-topbar__left">
        {backTo ? (
          <button className="app-topbar__back" onClick={() => navigate(backTo)}>
            <ArrowLeftIcon size={18} />
            {backLabel}
          </button>
        ) : (
          <Link to="/dashboard" className="app-topbar__brand">
            <BusIcon size={28} />
            <span>SmartTransit</span>
          </Link>
        )}
      </div>

      <div className="app-topbar__right">
        <div className="app-topbar__points">
          <CoinIcon size={16} />
          <span>{REWARDS_POINTS.toLocaleString()} pts</span>
        </div>

        <div className="app-topbar__notifications">
          <button
            className="app-topbar__bell"
            aria-label="Notifications"
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            <BellIcon size={20} />
            {unreadCount > 0 && <span className="app-topbar__bell-dot" />}
          </button>

          {notificationsOpen && (
            <div className="app-topbar__dropdown">
              <p className="app-topbar__dropdown-title">Notifications</p>
              {NOTIFICATIONS.map((note) => (
                <div
                  key={note.id}
                  className={`app-topbar__notification ${note.read ? "" : "app-topbar__notification--unread"}`}
                >
                  <p>{note.title}</p>
                  <span>{note.detail}</span>
                  <span className="app-topbar__notification-time">{note.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <Link to="/profile" className="app-topbar__avatar" aria-label="View profile">
          J
        </Link>
      </div>
    </header>
  );
}
