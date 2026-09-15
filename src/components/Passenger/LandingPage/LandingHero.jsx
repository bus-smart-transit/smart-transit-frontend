import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, MapPin, Calendar, Search, ChevronDown } from 'lucide-react';
import Button from '../../ui/Button';
import { getBusinessToday } from '../../../utils/dates';
import heroBg from '../../../assets/hero.png';

export default function LandingHero({ onSearch, searchState }) {
  const navigate = useNavigate();
  const [from, setFrom] = useState(searchState?.from ?? '');
  const [to, setTo] = useState(searchState?.to ?? '');
  const [date, setDate] = useState(searchState?.date ?? getBusinessToday());

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
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/80 via-navy-950/60 to-navy-950/40" aria-hidden="true" />

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
            Track your bus, manage your trips, access your tickets, and enjoy a smarter public transit experience across Davao Region XI.
          </p>

          {/* Hero CTAs — Book Seat reads as the clear primary action; Track Live
              (Track a Bus) is the secondary, outline action. */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="#search-trips" variant="accent" size="md">
              Get Started
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => navigate('/passenger/dashboard?tab=map')}
              className="border-white/40 bg-white/5 text-white hover:bg-white/15 hover:text-white"
            >
              Track a Bus
            </Button>
          </div>
        </div>
      </div>

      {/* Booking Widget — sits at the bottom of the hero */}
      <div id="search-trips" className="relative -mt-4 px-4 pb-0 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Search Trips</h2>
            <p className="mt-0.5 text-sm text-slate-500">Sign in required to complete a booking.</p>

            <form onSubmit={handleSubmit} className="mt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                {/* FROM */}
                <div className="flex-1">
                  <label htmlFor="hero-from" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">From</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 h-11">
                    <MapPin className="h-4 w-4 text-teal-600 shrink-0" aria-hidden="true" />
                    <input
                      id="hero-from"
                      type="text"
                      placeholder="Choose origin"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="h-full w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-400"
                    />
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                  </div>
                </div>

                {/* Swap button */}
                <button
                  type="button"
                  onClick={swap}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-teal-600 transition hover:bg-slate-50 sm:mx-0 self-end sm:self-auto"
                  aria-label="Swap origin and destination"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </button>

                {/* TO */}
                <div className="flex-1">
                  <label htmlFor="hero-to" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">To</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 h-11">
                    <MapPin className="h-4 w-4 text-teal-600 shrink-0" aria-hidden="true" />
                    <input
                      id="hero-to"
                      type="text"
                      placeholder="Choose destination"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="h-full w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-400"
                    />
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                  </div>
                </div>

                {/* Date */}
                <div className="flex-1">
                  <label htmlFor="hero-date" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Date</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 h-11">
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
                <Button type="submit" variant="primary" size="md" className="h-11 shrink-0" icon={Search}>
                  <span className="hidden sm:inline">Search</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
