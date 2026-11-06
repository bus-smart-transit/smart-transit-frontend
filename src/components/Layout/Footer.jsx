import { Link } from 'react-router-dom';
import BrandLogo from '../ui/BrandLogo';

export default function Footer() {
  return (
    <footer className="bg-navy-950 px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl flex flex-col items-center justify-between gap-4 sm:flex-row">
        {/* Brand */}
        <Link to="/" className="inline-flex items-center gap-2.5" aria-label="SmartTransit home">
          <BrandLogo onDark className="h-8" />
        </Link>

        {/* 2026-11-06: sample Privacy Policy and Terms for the test period. */}
        <nav aria-label="Legal" className="flex gap-4 text-xs">
          <Link to="/privacy" className="text-slate-300 hover:text-white">Privacy Policy</Link>
          <Link to="/terms" className="text-slate-300 hover:text-white">Terms of Service</Link>
        </nav>

        {/* Copyright */}
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()}. All rights reserved.
        </p>

      </div>
    </footer>
  );
}
