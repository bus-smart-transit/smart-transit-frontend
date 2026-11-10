import { useEffect, useState } from "react";
import { LocationIcon, CalendarIcon, SearchIcon } from "./Icons.jsx";
import { TERMINALS } from "../data/sampleData.js";
import Button from "./ui/Button.jsx";

// `prefill` ({ origin, destination, key }) lets other parts of the page, like
// the province cards, fill in the form. A new `key` applies it again.
export default function BookingWidget({ onSearch, prefill }) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [highlight, setHighlight] = useState(null); // field just filled in for the passenger

  useEffect(() => {
    if (!prefill) return undefined;
    setOrigin(prefill.origin ?? "");
    setDestination(prefill.destination ?? "");
    setHighlight(prefill.destination ? "destination" : prefill.origin ? "origin" : null);
    const id = window.setTimeout(() => setHighlight(null), 1800);
    return () => window.clearTimeout(id);
  }, [prefill]);

  const fieldClass = (name) =>
    `flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 transition-shadow duration-300 focus-within:border-navy-700 focus-within:ring-2 focus-within:ring-navy-700/30 ${
      highlight === name ? "border-teal-500 ring-4 ring-teal-400/40" : "border-slate-300"
    }`;

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
        <p className="text-sm text-slate-500">Choose where you board, where you get off and the day. Sign in to complete a booking.</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            From
          </span>
          <span className={fieldClass("origin")}>
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

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            To
          </span>
          <span className={fieldClass("destination")}>
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
