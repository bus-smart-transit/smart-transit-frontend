import { Link } from 'react-router-dom';
import { Bus } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0D1B2A] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl flex flex-col items-center justify-between gap-4 sm:flex-row">
        {/* Brand */}
        <Link to="/" className="inline-flex items-center gap-2.5" aria-label="SmartTransit home">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-white">
            <Bus className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-bold text-white">SmartTransit</span>
        </Link>

        {/* Copyright */}
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()}. All rights reserved.
        </p>

        {/* Quick links */}
        <nav className="flex items-center gap-5 text-xs text-slate-400" aria-label="Footer navigation">
          <Link to="/passenger/login" className="transition hover:text-white">Passenger Login</Link>
          <Link to="/passenger/signup" className="transition hover:text-white">Sign Up</Link>
          <Link to="/employee/login" className="transition hover:text-white">Staff Login</Link>
        </nav>
      </div>
    </footer>
  );
}
