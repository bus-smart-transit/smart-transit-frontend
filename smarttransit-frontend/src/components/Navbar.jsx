import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { BusIcon, MenuIcon, CloseIcon, GridIcon, TicketIcon, ClockIcon, MapPinIcon, GiftIcon, UserIcon, LogoutIcon } from "./Icons.jsx";
import ProfileDropdown from "./ProfileDropdown.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import Button from "./ui/Button.jsx";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "News", to: "/news" },
  { label: "FAQ", to: "/faq" },
  { label: "Contact Us", to: "/contact" },
];

const ACCOUNT_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: GridIcon },
  { to: "/my-tickets", label: "My Tickets", icon: TicketIcon },
  { to: "/trip-history", label: "Trip History", icon: ClockIcon },
  { to: "/track-bus", label: "Track Bus", icon: MapPinIcon },
  { to: "/rewards", label: "Rewards", icon: GiftIcon },
  { to: "/profile", label: "Profile", icon: UserIcon },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/");
  };

  const linkClasses = ({ isActive }) =>
    `text-sm font-medium transition-colors ${
      isActive ? "text-navy-800 font-semibold" : "text-slate-600 hover:text-navy-800"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between sm:h-20">
        <Link to="/" className="flex items-center gap-2 text-navy-900" onClick={() => setMenuOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-800 text-white">
            <BusIcon size={22} />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">SmartTransit</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClasses} end={link.to === "/"}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <ProfileDropdown />
          ) : (
            <Button to="/login" variant="primary" size="sm">
              Log In
            </Button>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-navy-900 md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <CloseIcon size={26} /> : <MenuIcon size={26} />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 pb-6 pt-2 md:hidden">
          <nav className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-3 text-base font-medium ${
                    isActive ? "bg-navy-50 text-navy-900" : "text-slate-700"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-3 border-t border-slate-100 pt-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 px-3 pb-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-400 text-base font-bold text-navy-900">
                    {user.firstName?.charAt(0) ?? "U"}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
                <nav className="flex flex-col">
                  {ACCOUNT_LINKS.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-base text-slate-700 hover:bg-slate-50"
                    >
                      <Icon size={20} className="text-slate-400" />
                      {label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-base font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogoutIcon size={20} />
                    Logout
                  </button>
                </nav>
              </>
            ) : (
              <Button to="/login" variant="primary" className="w-full" onClick={() => setMenuOpen(false)}>
                Log In
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
