import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { MenuIcon, CloseIcon, HomeIcon, BusIcon, BellIcon, InfoIcon, PhoneIcon, GridIcon, TicketIcon, ClockIcon, MapPinIcon, GiftIcon, UserIcon, LogoutIcon } from "./Icons.jsx";
import ProfileDropdown from "./ProfileDropdown.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import Button from "./ui/Button.jsx";
import Logo from "./Logo.jsx";

const NAV_LINKS = [
  { label: "Home", to: "/", icon: HomeIcon },
  { label: "About", to: "/about", icon: BusIcon },
  { label: "News", to: "/news", icon: BellIcon },
  { label: "FAQ", to: "/faq", icon: InfoIcon },
  { label: "Contact Us", to: "/contact", icon: PhoneIcon },
];

const ACCOUNT_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: GridIcon },
  { to: "/my-tickets", label: "My Tickets", icon: TicketIcon },
  { to: "/trip-history", label: "Trip History", icon: ClockIcon },
  { to: "/track-bus", label: "Track Bus", icon: MapPinIcon },
  { to: "/rewards", label: "Rewards", icon: GiftIcon },
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

  const drawerLinkClasses = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
      isActive ? "bg-white text-navy-900 shadow-sm" : "text-navy-200 hover:bg-teal-400/10 hover:text-teal-300"
    }`;

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between sm:h-20">
        <Link to="/" className="flex items-center gap-2 text-navy-900" onClick={() => setMenuOpen(false)}>
          <Logo className="h-10 sm:h-12" />
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
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          <MenuIcon size={26} />
        </button>
      </div>

    </header>

    {menuOpen && (
      <div
        className="fixed inset-0 z-40 bg-navy-950/50 md:hidden"
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
    )}

    <aside
      className={`fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-navy-900 p-5 transition-transform duration-200 md:hidden ${
        menuOpen ? "translate-x-0" : "translate-x-full"
      }`}
      aria-hidden={!menuOpen}
    >
      <div className="flex items-center justify-between">
        <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-white">
          <Logo className="h-10" onDark />
        </Link>
        <button
          type="button"
          className="rounded-lg p-1.5 text-navy-200 hover:bg-white/10"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        >
          <CloseIcon size={22} />
        </button>
      </div>

      <nav className="mt-6 flex flex-col gap-1 border-b border-white/10 pb-4">
        {NAV_LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"} onClick={() => setMenuOpen(false)} className={drawerLinkClasses}>
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
      </nav>

      {isAuthenticated ? (
        <>
          <p className="mt-4 px-3.5 text-xs font-semibold uppercase tracking-wider text-navy-400">Main</p>
          <nav className="mt-2 flex flex-col gap-1">
            {ACCOUNT_LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} onClick={() => setMenuOpen(false)} className={drawerLinkClasses}>
                <Icon size={19} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
            <div className="flex items-center gap-3 px-3.5 pb-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-400 text-sm font-bold text-navy-900">
                {user.firstName?.charAt(0) ?? "U"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                <p className="truncate text-xs text-navy-300">{user.email}</p>
              </div>
            </div>
            <NavLink to="/profile" onClick={() => setMenuOpen(false)} className={drawerLinkClasses}>
              <UserIcon size={18} />
              Profile
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-red-300 hover:bg-white/10"
            >
              <LogoutIcon size={18} />
              Logout
            </button>
          </div>
        </>
      ) : (
        <div className="mt-auto pt-4">
          <Button to="/login" variant="primary" className="w-full" onClick={() => setMenuOpen(false)}>
            Log In
          </Button>
        </div>
      )}
    </aside>
    </>
  );
}
