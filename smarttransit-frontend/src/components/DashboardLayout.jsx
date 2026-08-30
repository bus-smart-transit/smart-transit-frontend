import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BusIcon,
  HomeIcon,
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
import { useAuth } from "../context/AuthContext.jsx";

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
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    setSidebarOpen(false);
    navigate("/");
  };

  const linkClasses = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
      isActive ? "bg-white text-navy-900 shadow-sm" : "text-navy-200 hover:bg-teal-400/10 hover:text-teal-300"
    }`;

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-navy-900 p-5 transition-transform duration-200 lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:w-64 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <BusIcon size={20} />
            </span>
            <span className="font-display text-base font-bold">SmartTransit</span>
          </div>
          <button
            className="rounded-lg p-1.5 text-navy-200 hover:bg-white/10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <CloseIcon size={22} />
          </button>
        </div>

        <div className="mt-6 border-b border-white/10 pb-4">
          <NavLink to="/" end onClick={() => setSidebarOpen(false)} className={linkClasses}>
            <HomeIcon size={19} />
            Homepage
          </NavLink>
        </div>

        <p className="mt-4 px-3.5 text-xs font-semibold uppercase tracking-wider text-navy-400">
          Main
        </p>
        <nav className="mt-2 flex flex-col gap-1">
          {MAIN_LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)} className={linkClasses}>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
          <NavLink to="/profile" onClick={() => setSidebarOpen(false)} className={linkClasses}>
            <UserIcon size={18} />
            Profile
          </NavLink>
          <button
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-red-300 hover:bg-white/10"
            onClick={handleLogout}
          >
            <LogoutIcon size={18} />
            Logout
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex h-14 items-center border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            className="rounded-lg p-2 text-navy-900"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <MenuIcon size={24} />
          </button>
        </div>
        <AppTopBar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
