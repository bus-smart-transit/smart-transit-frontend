import { useState } from "react";
import { LocationIcon, SwapIcon, CalendarIcon, SearchIcon } from "./Icons.jsx";
import { TERMINALS } from "../data/sampleData.js";
import Button from "./ui/Button.jsx";

export default function BookingWidget({ onSearch }) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");

  const swapLocations = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleOriginChange = (value) => {
    setOrigin(value);
    if (value && value === destination) setDestination("");
  };

  const handleDestinationChange = (value) => {
    setDestination(value);
    if (value && value === origin) setOrigin("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (onSearch) onSearch({ origin, destination, date });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white p-5 shadow-xl ring-1 ring-black/5 sm:p-6"
    >
      <div className="mb-4">
        <h2 className="font-display text-lg font-bold text-navy-950">Search Trips</h2>
        <p className="text-sm text-slate-500">Sign in required to complete a booking</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_auto] lg:items-end">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            From
          </span>
          <span className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus-within:border-navy-700 focus-within:ring-2 focus-within:ring-navy-700/30">
            <LocationIcon size={18} className="shrink-0 text-slate-400" />
            <select
              value={origin}
              onChange={(e) => handleOriginChange(e.target.value)}
              className="w-full bg-transparent text-sm text-ink focus:outline-none"
            >
              <option value="">Choose origin</option>
              {TERMINALS.map((t) => (
                <option key={t} value={t} disabled={t === destination}>
                  {t}
                </option>
              ))}
            </select>
          </span>
        </label>

        <button
          type="button"
          onClick={swapLocations}
          aria-label="Swap origin and destination"
          className="mx-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-500 hover:bg-slate-50 lg:mb-0.5"
        >
          <SwapIcon size={18} />
        </button>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            To
          </span>
          <span className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus-within:border-navy-700 focus-within:ring-2 focus-within:ring-navy-700/30">
            <LocationIcon size={18} className="shrink-0 text-slate-400" />
            <select
              value={destination}
              onChange={(e) => handleDestinationChange(e.target.value)}
              className="w-full bg-transparent text-sm text-ink focus:outline-none"
            >
              <option value="">Choose destination</option>
              {TERMINALS.map((t) => (
                <option key={t} value={t} disabled={t === origin}>
                  {t}
                </option>
              ))}
            </select>
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Date
          </span>
          <span className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 focus-within:border-navy-700 focus-within:ring-2 focus-within:ring-navy-700/30">
            <CalendarIcon size={18} className="shrink-0 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Travel date"
              className="w-full bg-transparent text-sm text-ink focus:outline-none"
            />
          </span>
        </label>

        <Button type="submit" variant="primary" size="lg" className="w-full lg:w-auto">
          <SearchIcon size={18} />
          Search
        </Button>
      </div>
    </form>
  );
}
