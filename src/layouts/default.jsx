/**
 * DefaultLayout — a minimal shell for public routes that need a shared
 * nav/footer.  The LandingPage is now self-contained and does not use
 * this layout.  This file uses pure Tailwind utilities.
 */
import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Bus, Menu, X } from 'lucide-react';

export default function DefaultLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-200">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Bus className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-base font-bold tracking-tight text-slate-100">
              Smart<span className="text-sky-400">Transit</span>
            </span>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
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
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <nav className="border-t border-slate-800 bg-slate-950 px-4 pb-5 pt-3 md:hidden">
            <div className="flex flex-col gap-2">
              <Link
                to="/passenger/login"
                className="w-full rounded-xl border border-slate-700 py-3 text-center text-sm font-semibold text-slate-200 transition hover:border-slate-500"
                onClick={() => setMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link
                to="/passenger/signup"
                className="w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-500"
                onClick={() => setMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="text-sm font-bold text-slate-300">
                Smart<span className="text-sky-400">Transit</span>
              </span>
            </Link>
            <p className="text-xs text-slate-600">© {new Date().getFullYear()} SmartTransit.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}