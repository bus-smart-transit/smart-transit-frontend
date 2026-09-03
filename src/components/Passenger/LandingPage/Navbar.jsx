import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bus, Menu, X } from 'lucide-react';
import { useAuth } from '../../../api/hooks/useAuth';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'News', to: '/news' },
  { label: 'Contact Us', to: '/contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, isLoading } = useAuth();
  const userInitial = (user?.name || user?.username || user?.email || 'P')[0].toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0D1B2A]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
        {/* Logo */}
        <Link to="/" className="inline-flex items-center gap-2.5" aria-label="SmartTransit home">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-white">
            <Bus className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-base font-bold tracking-tight text-white">
            SmartTransit
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Site navigation">
          {NAV_LINKS.map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              className="text-sm font-medium text-slate-300 transition hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop auth */}
        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <>
              <Link
                to="/passenger/dashboard"
                className="rounded-lg border border-teal-300 px-5 py-2 text-sm font-semibold text-teal-100 transition hover:border-teal-200 hover:text-white"
              >
                Dashboard
              </Link>
              <Link
                to="/passenger/dashboard?tab=profile"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-400"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-700/60 text-xs font-bold text-white">{userInitial}</span>
                Profile
              </Link>
            </>
          ) : isLoading ? (
            <div className="h-9 w-35 animate-pulse rounded-lg bg-slate-700/60" />
          ) : (
            <>
              <Link
                to="/passenger/signup"
                className="rounded-lg border border-slate-600 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-400 hover:text-white"
              >
                Sign Up
              </Link>
              <Link
                to="/passenger/login"
                className="rounded-lg bg-teal-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-400"
              >
                Log In
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label="Toggle navigation menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav
          id="mobile-nav"
          className="border-t border-slate-800 bg-[#0D1B2A] px-4 pb-5 pt-3 md:hidden"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="mt-2 border-t border-slate-800 pt-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/passenger/dashboard"
                    className="block w-full rounded-lg bg-teal-500 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-teal-400"
                    onClick={() => setOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/passenger/dashboard?tab=profile"
                    className="mt-2 block w-full rounded-lg border border-slate-700 py-2.5 text-center text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
                    onClick={() => setOpen(false)}
                  >
                    Profile
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/passenger/login"
                    className="block w-full rounded-lg bg-teal-500 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-teal-400"
                    onClick={() => setOpen(false)}
                  >
                    Log In
                  </Link>
                  <Link
                    to="/passenger/signup"
                    className="mt-2 block w-full rounded-lg border border-slate-700 py-2.5 text-center text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
                    onClick={() => setOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
