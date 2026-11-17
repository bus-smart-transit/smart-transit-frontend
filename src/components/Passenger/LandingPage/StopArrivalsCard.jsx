import { useState } from 'react';
import { X } from 'lucide-react';
import useStopArrivals from '../../../api/hooks/Passenger/useStopArrivals';
import { busLine, etaBand, etaText, updatedText } from '../../../utils/stopArrivals';

/**
 * Batch 77 (user, 2026-11-17): the minimalist card of a clicked stop pin on Track Bus: the stop's name, its next three
 * buses soonest first ("{company} – {body no}", "To {destination}", minutes with an ETA band), whether the times are live,
 * when they were last updated, and "View all arrivals". A floating card over the map on wide screens, a bottom sheet on
 * phones. Every value comes from the server (StopArrivalsService).
 */
export default function StopArrivalsCard({ stop, onClose, onViewTrips }) {
  const [all, setAll] = useState(false);
  const { loading, data, error } = useStopArrivals(stop?.code, all);
  if (!stop) return null;
  const arrivals = data?.arrivals || [];
  const anyLive = arrivals.some((arrival) => arrival.live);

  return (
    <section
      aria-label={`Next arrivals at ${data?.stop?.name || stop.name}`}
      data-testid="stop-arrivals-card"
      className="fixed inset-x-0 bottom-0 z-30 max-h-[70vh] overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 shadow-card-hover sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-3 sm:top-3 sm:w-80 sm:rounded-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold leading-tight text-navy-950">{data?.stop?.name || stop.name || 'Not provided'}</h3>
          {data?.stop?.municipality && <p className="text-xs text-slate-500">{data.stop.municipality}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-slate-500 hover:bg-slate-100">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-navy-950">Next arrivals</p>
        {arrivals.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600" data-testid="arrivals-source">
            <span className={`h-2 w-2 rounded-full ${anyLive ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />
            {anyLive ? 'Live updates' : 'Timetable times'}
          </span>
        )}
      </div>

      {loading && <p className="mt-3 text-sm text-slate-500">Loading arrivals...</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      {!loading && !error && arrivals.length === 0 && (
        <p className="mt-3 text-sm text-slate-600" data-testid="arrivals-none">No buses are due here in the next few hours.</p>
      )}

      {arrivals.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-100" data-testid="arrivals-list">
          {arrivals.map((arrival) => {
            const band = etaBand(arrival);
            return (
              <li key={arrival.trip_id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{busLine(arrival)}</p>
                  <p className="truncate text-xs text-slate-500">To {arrival.destination || 'Not provided'}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-data text-base font-bold text-navy-950">{etaText(arrival)}</p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${band.tone}`}>{band.label}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {data?.updated_at && <p className="mt-2 text-xs text-slate-500">{updatedText(data.updated_at)}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {!all && Number(data?.total) > arrivals.length && (
          <button type="button" onClick={() => setAll(true)} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-slate-50" data-testid="view-all-arrivals">
            View all arrivals ({data.total})
          </button>
        )}
        <button type="button" onClick={() => onViewTrips?.(stop.code)} className="rounded-full bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-900" data-testid="stop-pin-trips">
          View available trips from {data?.stop?.name || stop.name}
        </button>
      </div>
    </section>
  );
}
