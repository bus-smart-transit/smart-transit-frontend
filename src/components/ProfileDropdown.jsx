import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GridIcon,
  TicketIcon,
  ClockIcon,
  MapPinIcon,
  GiftIcon,
  UserIcon,
  LogoutIcon,
  ChevronDownIcon,
} from "./Icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const MENU_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: GridIcon },
  { to: "/my-tickets", label: "My Tickets", icon: TicketIcon },
  { to: "/trip-history", label: "Trip History", icon: ClockIcon },
  { to: "/track-bus", label: "Track Bus", icon: MapPinIcon },
  { to: "/rewards", label: "Rewards", icon: GiftIcon },
  { to: "/profile", label: "Profile", icon: UserIcon },
];

export default function ProfileDropdown({ variant = "light" }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/");
  };

  if (!user) return null;

  const isDark = variant === "dark";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-sm font-semibold transition-colors ${
          isDark
            ? "bg-white/10 text-white hover:bg-white/20"
            : "bg-slate-100 text-navy-900 hover:bg-slate-200"
        }`}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-400 text-sm font-bold text-navy-900">
          {user.firstName?.charAt(0) ?? "U"}
        </span>
        <span>Hi, {user.firstName}</span>
        <ChevronDownIcon size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl animate-fade-in"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-navy-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="py-1.5">
            {MENU_ITEMS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                role="menuitem"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-900"
              >
                <Icon size={18} className="text-slate-400" />
                {label}
              </Link>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-1.5">
            <button
              type="button"
              onClick={handleLogout}
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogoutIcon size={18} />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
