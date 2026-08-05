import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const HIGHLIGHTS = [
  'View and book available trips',
  'Track your ticket and boarding status',
  'Monitor live arrivals on the map',
];

export default function PassengerEntryCard() {
  return (
    <article className="overflow-hidden rounded-2xl border border-blue-500/20 bg-linear-to-br from-blue-600/10 via-slate-900 to-slate-900">
      {/* Top accent bar */}
      <div className="h-1 bg-linear-to-r from-blue-500 via-indigo-500 to-sky-400" aria-hidden="true" />

      <div className="p-6 sm:p-8">
        {/* Ticket-style dashed divider line */}
        <div className="relative -mx-6 -mt-0 mb-6 hidden sm:block" aria-hidden="true">
          <div className="border-t border-dashed border-slate-700/60" />
          <span className="absolute left-0 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950" />
          <span className="absolute right-0 top-1/2 h-5 w-5 translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950" />
        </div>

        <h3 className="text-xl font-bold text-slate-100">Passenger Entry</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Browse routes, book seats, and monitor arrivals in real time from your personal dashboard.
        </p>

        <ul className="mt-4 space-y-2" aria-label="Passenger features">
          {HIGHLIGHTS.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm text-slate-400">
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/passenger/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Open Dashboard
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            to="/passenger/signup"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            Create Account
          </Link>
        </div>
      </div>
    </article>
  );
}
