import { useState } from 'react';
import { ArrowLeftRight, MapPin, Calendar, Search } from 'lucide-react';
import heroBg from '../../../assets/hero.png';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function LandingHero({ onSearch, searchState }) {
  const [from, setFrom] = useState(searchState?.from ?? '');
  const [to, setTo] = useState(searchState?.to ?? '');
  const [date, setDate] = useState(searchState?.date ?? today());

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({ from, to, date });
  };

  // Format date for display (e.g. 05/10/2026)
  const displayDate = date
    ? date.split('-').reverse().join('/').replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$2/$1/$3')
    : '';

  return (
    <section className="relative overflow-hidden">
      {/* Hero background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
        aria-hidden="true"
      />
      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0D1B2A]/80 via-[#0D1B2A]/60 to-[#0D1B2A]/40" aria-hidden="true" />

      <div className="relative px-4 pb-20 pt-14 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          {/* Badge */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-teal-500/90 px-3 py-1 text-xs font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" aria-hidden="true" />
            REAL-TIME GPS ACTIVE
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Ride smarter,<br />arrive on time.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-200 sm:text-lg">
            Book your seat, track your bus live, and pay online — the complete public transit experience, right in your browser.
          </p>
        </div>
      </div>

      {/* Booking Widget — sits at the bottom of the hero */}
      <div className="relative -mt-4 px-4 pb-0 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-teal-500 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white">Book a Seat</h2>
            <p className="mt-0.5 text-sm text-teal-100">Guest checkout is supported. Sign in for rewards and history.</p>

            <form onSubmit={handleSubmit} className="mt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                {/* FROM */}
                <div className="flex-1">
                  <label htmlFor="hero-from" className="sr-only">From</label>
                  <div className="flex items-center gap-2 rounded-lg border border-teal-400/50 bg-white/90 px-3 h-11">
                    <MapPin className="h-4 w-4 text-teal-600 shrink-0" aria-hidden="true" />
                    <input
                      id="hero-from"
                      type="text"
                      placeholder="FROM"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="h-full w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:font-semibold placeholder:text-slate-400 uppercase"
                    />
                  </div>
                </div>

                {/* Swap button */}
                <button
                  type="button"
                  onClick={swap}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-teal-400/50 bg-white/90 text-teal-600 transition hover:bg-white sm:mx-0 self-end sm:self-auto"
                  aria-label="Swap origin and destination"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </button>

                {/* TO */}
                <div className="flex-1">
                  <label htmlFor="hero-to" className="sr-only">To</label>
                  <div className="flex items-center gap-2 rounded-lg border border-teal-400/50 bg-white/90 px-3 h-11">
                    <MapPin className="h-4 w-4 text-teal-600 shrink-0" aria-hidden="true" />
                    <input
                      id="hero-to"
                      type="text"
                      placeholder="TO"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="h-full w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:font-semibold placeholder:text-slate-400 uppercase"
                    />
                  </div>
                </div>

                {/* Date */}
                <div className="flex-1">
                  <label htmlFor="hero-date" className="sr-only">Select Date</label>
                  <div className="flex items-center gap-2 rounded-lg border border-teal-400/50 bg-white/90 px-3 h-11">
                    <Calendar className="h-4 w-4 text-teal-600 shrink-0" aria-hidden="true" />
                    <input
                      id="hero-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-full w-full bg-transparent text-sm text-slate-700 outline-none"
                    />
                  </div>
                </div>

                {/* Search button */}
                <button
                  type="submit"
                  className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-[#0D1B2A] px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Search</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
