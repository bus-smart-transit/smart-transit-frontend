import { Link } from 'react-router-dom';
import { ArrowRight, Bus, Clock3, MapPin, X } from 'lucide-react';
import { routeHref } from '../../../utils/routePages';

const CHIP_TONES = {
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  default: 'bg-slate-100 text-slate-700',
};

/**
 * 2026-11-21 (user): the card of a clicked bus on Track Bus (the user's suggested design): the company and body number,
 * where the bus is, its next stop or when it leaves with the minutes, chips for the service, class and state, and
 * "View route" (the route's own page). Placed like the stop card: floating over the map on wide screens, a bottom
 * sheet on phones, also in the full-screen map. Renders only; utils/busCard shapes the values.
 */
export default function BusInfoCard({ view, onClose }) {
  if (!view) return null;
  const { next } = view;

  return (
    <section
      aria-label={`Bus ${view.title}${view.bodyNo ? ` ${view.bodyNo}` : ''}`}
      data-testid="bus-info-card"
      className="fixed inset-x-0 bottom-0 z-30 max-h-[70vh] overflow-y-auto rounded-t-2xl border border-slate-200 border-t-4 border-t-teal-600 bg-white p-4 shadow-card-hover sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-3 sm:top-3 sm:max-h-[calc(100%-1.5rem)] sm:w-96 sm:rounded-2xl"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700" aria-hidden="true">
          <Bus size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="break-words font-display text-lg font-bold leading-tight text-navy-950">{view.title}</h3>
          {view.bodyNo && <span className="mt-1 inline-block rounded-full bg-teal-50 px-2.5 py-0.5 font-data text-sm font-bold text-teal-800" data-testid="bus-card-body-no">{view.bodyNo}</span>}
          {view.route && <p className="mt-1 break-words text-xs text-slate-500">{view.route}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-slate-500 hover:bg-slate-100">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="flex items-start gap-2 text-sm font-semibold text-slate-900" data-testid="bus-card-place">
          <MapPin size={16} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
          <span>{view.place || 'Location: Not provided'}</span>
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-teal-50 px-4 py-3" data-testid="bus-card-next">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-teal-800">{next.label}</p>
          {next.place && <p className="break-words text-sm font-bold text-navy-950">{next.place}</p>}
          {next.time && <p className="font-data text-xl font-bold text-navy-950">{next.time}</p>}
          {next.time && !next.minutes && next.label !== 'Leaves' && <p className="text-xs text-slate-600">{next.live ? 'Live estimate' : 'Timetable time'}</p>}
        </div>
        {next.minutes && (
          <div className="shrink-0 border-l border-teal-200 pl-3 text-right">
            <p className="inline-flex items-center gap-1 font-data text-base font-bold text-teal-800"><Clock3 size={16} aria-hidden="true" />{next.minutes}</p>
            <p className="text-xs text-slate-600">{next.label === 'Leaves' ? 'Timetable time' : next.live ? 'Live estimate' : 'Timetable time'}</p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap gap-1.5" data-testid="bus-card-chips">
          {view.type && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2.5 pr-0.5 text-xs font-semibold text-slate-600" data-testid="bus-card-type">
              Type: <span className="rounded-full bg-teal-700 px-2 py-0.5 text-white">{view.type}</span>
            </span>
          )}
          {view.chips.map((chip) => (
            <span key={chip.key} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${CHIP_TONES[chip.tone] || CHIP_TONES.default}`}>{chip.label}</span>
          ))}
        </span>
        {view.routeId && (
          <Link to={routeHref(view.routeId)} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800" data-testid="bus-card-view-route">
            View route <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}
