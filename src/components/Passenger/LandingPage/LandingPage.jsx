import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bus,
  Clock3,
  MapPin,
  Route,
  Search,
  ShieldCheck,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';

const METRICS = [
  { value: '13 / 15', label: 'Active Buses' },
  { value: '465', label: 'Passengers Today' },
  { value: '11', label: 'Fleets on Trip' },
  { value: '98%', label: 'On-Time Rate' },
];

const FEATURES = [
  {
    icon: Bus,
    title: 'Real-Time Arrivals',
    desc: 'Track active buses and get minute-by-minute updates before boarding.',
  },
  {
    icon: Ticket,
    title: 'Digital Ticketing',
    desc: 'Book and pay in one flow with secure checkout and instant confirmation.',
  },
  {
    icon: Route,
    title: 'Route-Aware Search',
    desc: 'Search by current location and destination to view the best route options.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Ride Data',
    desc: 'Every trip status is synchronized with fleet operations and driver updates.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 pb-12 pt-8 text-slate-200 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <header className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-6 py-8 sm:px-8 lg:px-10">
          <div className="pointer-events-none absolute -left-20 top-0 h-60 w-60 rounded-full bg-blue-500/15 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-20 bottom-0 h-60 w-60 rounded-full bg-cyan-500/15 blur-3xl" aria-hidden="true" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">
                <Clock3 className="h-3.5 w-3.5" />
                Live Transit Platform
              </span>
              <h1 className="mt-4 text-3xl font-bold text-slate-100 sm:text-4xl lg:text-5xl">
                Ride Smarter With
                <span className="block bg-linear-to-r from-blue-400 via-cyan-400 to-sky-300 bg-clip-text text-transparent">
                  Real-Time City Transit
                </span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-slate-400 sm:text-base">
                SmartTransit is your entry point for booking rides and tracking arrivals in real time.
                Search your origin and destination, compare route options, and proceed to booking in one flow.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/passenger/signup"
                  id="hero-signup-btn"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  Create Passenger Account
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/passenger/login"
                  id="hero-login-btn"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
                >
                  Sign In
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-100">Find Your Route</h2>
                <p className="text-xs text-slate-500">Input your location and destination to preview active routes.</p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  From
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3">
                    <MapPin className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <input
                      type="text"
                      placeholder="Current location"
                      className="h-11 w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
                    />
                  </div>
                </label>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  To
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3">
                    <Route className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <input
                      type="text"
                      placeholder="Destination"
                      className="h-11 w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
                    />
                  </div>
                </label>
                <Link
                  to="/passenger/dashboard"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                >
                  <Search className="h-4 w-4" />
                  Search Routes
                </Link>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((metric) => (
            <article key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="font-data text-2xl font-semibold text-slate-100">{metric.value}</p>
              <p className="mt-1 text-sm text-slate-500">{metric.label}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <article key={title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-sky-300">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-100">{title}</h3>
              <p className="mt-2 text-sm text-slate-400">{desc}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 lg:col-span-2">
            <div className="h-1.5 bg-linear-to-r from-blue-500 via-indigo-500 to-sky-400" />
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-100">Passenger Entry</h3>
              <p className="mt-2 text-sm text-slate-400">
                Browse routes, book seats, and monitor arrivals in real time from the passenger dashboard.
              </p>
              <div className="relative -mx-6 my-6" aria-hidden="true">
                <div className="border-t border-dashed border-slate-700" />
                <span className="absolute left-0 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950" />
                <span className="absolute right-0 top-1/2 h-5 w-5 translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950" />
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/passenger/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  Open Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/passenger/signup"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-base font-semibold text-slate-100">Operations Access</h3>
            <p className="mt-2 text-sm text-slate-500">For operator, driver, and chauffeur portal access.</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                <span className="inline-flex items-center gap-2 text-slate-300"><Users className="h-4 w-4 text-sky-400" />Operator</span>
                <span className="font-data text-slate-400">Desktop</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                <span className="inline-flex items-center gap-2 text-slate-300"><Bus className="h-4 w-4 text-sky-400" />Driver</span>
                <span className="font-data text-slate-400">Tablet</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                <span className="inline-flex items-center gap-2 text-slate-300"><Wallet className="h-4 w-4 text-sky-400" />Chauffeur</span>
                <span className="font-data text-slate-400">Mobile</span>
              </div>
            </div>
            <Link
              to="/employee/login"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
            >
              Open Staff Login
            </Link>
          </article>
        </section>
      </div>
    </div>
  );
}
