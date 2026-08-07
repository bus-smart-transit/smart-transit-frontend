import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bus, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
        {/* Logo */}
        <Link to="/" className="inline-flex items-center gap-2.5" aria-label="SmartTransit home">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Bus className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-base font-bold tracking-tight text-slate-100">
            Smart<span className="text-sky-400">Transit</span>
          </span>
        </Link>

        {/* Desktop auth */}
        <nav className="hidden items-center gap-3 md:flex" aria-label="Site navigation">
          <Link
            to="/passenger/login"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            Sign In
          </Link>
          <Link
            to="/passenger/signup"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Get Started
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 md:hidden"
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
          className="border-t border-slate-800 bg-slate-950 px-4 pb-5 pt-3 md:hidden"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col gap-2">
            <Link
              to="/passenger/login"
              className="w-full rounded-xl border border-slate-700 py-3 text-center text-sm font-semibold text-slate-200 transition hover:border-slate-500"
              onClick={() => setOpen(false)}
            >
              Sign In
            </Link>
            <Link
              to="/passenger/signup"
              className="w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-500"
              onClick={() => setOpen(false)}
            >
              Get Started
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
