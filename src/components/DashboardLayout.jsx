import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  GridIcon,
  TicketIcon,
  ClockIcon,
  MapPinIcon,
  GiftIcon,
  UserIcon,
  LogoutIcon,
  CloseIcon,
} from "./Icons.jsx";
import AppTopBar from "./AppTopBar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import Logo from "./Logo.jsx";

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
  const { pathname } = useLocation();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    setSidebarOpen(false);
    navigate("/");
  };

  const linkClasses = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition-colors ${
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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-navy-900 p-5 transition-transform duration-200 lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:w-72 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Logo className="h-10" onDark />
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
            <HomeIcon size={20} />
            Homepage
          </NavLink>
        </div>

        <p className="mt-5 px-4 text-xs font-semibold uppercase tracking-wider text-navy-300">
          Main
        </p>
        <nav className="mt-2 flex flex-col gap-1">
          {MAIN_LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)} className={linkClasses}>
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
          <NavLink to="/profile" onClick={() => setSidebarOpen(false)} className={linkClasses}>
            <UserIcon size={20} />
            Profile
          </NavLink>
          <button
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-[15px] font-medium text-red-300 transition-colors hover:bg-white/10"
            onClick={handleLogout}
          >
            <LogoutIcon size={20} />
            Logout
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <AppTopBar onMenuClick={() => setSidebarOpen(true)} />
        <main key={pathname} className="mx-auto max-w-7xl px-4 py-8 motion-safe:animate-page-in sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
