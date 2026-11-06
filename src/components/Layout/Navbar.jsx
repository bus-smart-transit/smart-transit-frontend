import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import BrandLogo from '../ui/BrandLogo';
import { Menu, X, House, Info, MapPin, Newspaper, CircleHelp, Phone, LayoutGrid, Ticket, History, Gift, User, LogOut } from 'lucide-react';
import { useAuth } from '../../api/hooks/useAuth';
import ProfileDropdown from './ProfileDropdown';

// 2026-11-06 (passenger redesign, joshua-frontend): a white header with the site links and one Log In button
// (sign-up is reached from the login page); on phones a navy drawer from the right. Track Bus is a site link so
// anyone can follow a bus without an account.
const NAV_LINKS = [
  { label: 'Home', to: '/', icon: House },
  { label: 'About', to: '/about', icon: Info },
  { label: 'Track Bus', to: '/track-bus', icon: MapPin },
  { label: 'News', to: '/news', icon: Newspaper },
  { label: 'FAQ', to: '/faq', icon: CircleHelp },
  { label: 'Contact Us', to: '/contact', icon: Phone },
];

const ACCOUNT_LINKS = [
  { label: 'Dashboard', to: '/passenger/dashboard?tab=dashboard', icon: LayoutGrid },
  { label: 'My Tickets', to: '/passenger/dashboard?tab=tickets', icon: Ticket },
  { label: 'Trip History', to: '/passenger/dashboard?tab=transactions', icon: History },
  { label: 'Rewards', to: '/passenger/dashboard?tab=rewards', icon: Gift },
  { label: 'Profile', to: '/passenger/dashboard?tab=profile', icon: User },
];

const linkClass = ({ isActive }) => `text-sm font-medium transition-colors ${isActive ? 'font-semibold text-navy-800' : 'text-slate-600 hover:text-navy-800'}`;
const drawerLinkClass = ({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors ${isActive ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-200 hover:bg-teal-400/10 hover:text-teal-300'}`;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const close = () => setOpen(false);

  const handleMobileLogout = async () => {
    close();
    await logout();
    navigate('/');
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between sm:h-20">
          <Link to="/" className="inline-flex items-center" aria-label="SmartTransit home" onClick={close}>
            <BrandLogo className="h-10 sm:h-12" />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Site navigation">
            {NAV_LINKS.map(({ label, to }) => (to.includes('#')
              ? <Link key={label} to={to} className={linkClass({ isActive: false })}>{label}</Link>
              : <NavLink key={label} to={to} end={to === '/'} className={linkClass}>{label}</NavLink>))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            {isAuthenticated ? (
              <ProfileDropdown />
            ) : isLoading ? (
              <div className="h-10 w-24 animate-pulse rounded-full bg-slate-200" />
            ) : (
              <Link to="/passenger/login" className="inline-flex min-h-11 items-center rounded-full bg-navy-800 px-6 text-sm font-semibold text-white transition hover:bg-navy-700">
                Log In
              </Link>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-navy-900 lg:hidden"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-navy-950/50 lg:hidden" onClick={close} aria-hidden="true" />}

      <aside
        id="mobile-nav"
        className={`fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-navy-900 p-5 transition-transform duration-200 lg:hidden ${open ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!open}
        aria-label="Menu"
        inert={!open}
      >
        <div className="flex items-center justify-between">
          <Link to="/" onClick={close} aria-label="SmartTransit home"><BrandLogo light className="h-10" /></Link>
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-navy-200 hover:bg-white/10" onClick={close} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 flex flex-col gap-1 border-b border-white/10 pb-4" aria-label="Mobile navigation">
          {NAV_LINKS.map(({ label, to, icon: Icon }) => (
            <NavLink key={label} to={to} end onClick={close} className={to.includes('#') ? drawerLinkClass({ isActive: false }) : drawerLinkClass}>
              <Icon size={19} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        {isAuthenticated ? (
          <>
            <p className="mt-4 px-3.5 text-xs font-semibold uppercase tracking-wider text-navy-400">My account</p>
            <nav className="mt-2 flex flex-col gap-1" aria-label="Account">
              {ACCOUNT_LINKS.map(({ label, to, icon: Icon }) => (
                <Link key={label} to={to} onClick={close} className={drawerLinkClass({ isActive: false })}>
                  <Icon size={19} aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </nav>
            <button type="button" onClick={handleMobileLogout} className="mt-auto flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-left text-sm font-medium text-red-300 hover:bg-white/10">
              <LogOut size={18} aria-hidden="true" />
              Logout
            </button>
          </>
        ) : (
          <div className="mt-auto flex flex-col gap-2 pt-4">
            <Link to="/passenger/login" onClick={close} className="flex min-h-11 items-center justify-center rounded-full bg-teal-400 text-sm font-semibold text-navy-950 hover:bg-teal-300">Log In</Link>
            <Link to="/passenger/signup" onClick={close} className="flex min-h-11 items-center justify-center rounded-full border border-white/20 text-sm font-semibold text-white hover:bg-white/10">Create Account</Link>
          </div>
        )}
      </aside>
    </>
  );
}
