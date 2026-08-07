import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, MapPin, Route, Search } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950 px-4 py-14 sm:px-6 sm:py-20 lg:px-10">
      {/* Ambient glows */}
      <div
        className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-7xl items-start gap-10 lg:grid-cols-2 lg:items-center">
        {/* Hero copy */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-sky-300">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            Live Transit Platform
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-slate-100 sm:text-5xl lg:text-6xl">
            Ride Smarter With
            <span className="block bg-linear-to-r from-blue-400 via-cyan-400 to-sky-300 bg-clip-text text-transparent">
              Real-Time City Transit
            </span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-400 sm:text-lg">
            Book rides, track arrivals, and compare routes in one seamless flow.
            SmartTransit connects passengers with live fleet data across the city.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/passenger/signup"
              id="hero-signup-btn"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Create Account
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/passenger/login"
              id="hero-login-btn"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Route Search Card — primary action */}
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl ring-1 ring-slate-800">
          <h2 className="text-lg font-bold text-slate-100">Find Your Route</h2>
          <p className="mt-1 text-sm text-slate-400">
            Search by origin and destination to see active trips.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="search-origin"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500"
              >
                From
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 transition focus-within:border-sky-500/60 focus-within:ring-1 focus-within:ring-sky-500/30">
                <MapPin className="h-4 w-4 flex-shrink-0 text-slate-500" aria-hidden="true" />
                <input
                  id="search-origin"
                  type="text"
                  placeholder="Current location"
                  className="h-11 w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="search-destination"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500"
              >
                To
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 transition focus-within:border-sky-500/60 focus-within:ring-1 focus-within:ring-sky-500/30">
                <Route className="h-4 w-4 flex-shrink-0 text-slate-500" aria-hidden="true" />
                <input
                  id="search-destination"
                  type="text"
                  placeholder="Destination"
                  className="h-11 w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            <Link
              to="/passenger/dashboard"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Search Routes
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
