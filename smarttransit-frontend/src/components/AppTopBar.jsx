import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BusIcon, BellIcon, ArrowLeftIcon, CoinIcon } from "./Icons.jsx";
import { NOTIFICATIONS } from "../data/sampleData.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useRewards } from "../context/RewardsContext.jsx";

export default function AppTopBar({ backTo, backLabel = "Back" }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { points } = useRewards();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unreadCount = NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:h-20 sm:px-8">
      <div className="flex items-center">
        {backTo ? (
          <button
            onClick={() => navigate(backTo)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-navy-900"
          >
            <ArrowLeftIcon size={18} />
            {backLabel}
          </button>
        ) : (
          <Link to="/dashboard" className="flex items-center gap-2 text-navy-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-800 text-white">
              <BusIcon size={20} />
            </span>
            <span className="hidden font-display text-base font-bold sm:inline">SmartTransit</span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 sm:flex">
          <CoinIcon size={14} />
          {points.toLocaleString()} pts
        </div>

        <div className="relative">
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            aria-label="Notifications"
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            <BellIcon size={19} />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl animate-fade-in sm:w-80">
              <p className="px-4 py-2 text-sm font-semibold text-navy-950">Notifications</p>
              {NOTIFICATIONS.map((note) => (
                <div
                  key={note.id}
                  className={`px-4 py-3 text-sm ${note.read ? "" : "bg-navy-50/50"}`}
                >
                  <p className="font-medium text-navy-950">{note.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{note.detail}</p>
                  <p className="mt-1 text-xs text-slate-400">{note.time}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <Link
          to="/profile"
          aria-label="View profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-400 text-sm font-bold text-navy-900"
        >
          {user?.firstName?.charAt(0) ?? "U"}
        </Link>
      </div>
    </header>
  );
}
