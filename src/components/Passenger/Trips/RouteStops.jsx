import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import useRouteStops from '../../../api/hooks/Passenger/useRouteStops';
import { routeStopRows } from '../../../utils/routeStops';

import { SkeletonList } from '../../ui/Skeleton';
/**
 * Batch 54 (user, 2026-11-10): "View route stops" inside a trip card on All available trips. Every stop with its
 * time; "Get off here" on a stop after the boarding stop opens booking with that drop-off already chosen. The stops
 * are asked for only when the panel is opened. Renders only; useRouteStops loads, routeStopRows shapes.
 */
export default function RouteStops({ trip, onChooseDropOff }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const state = useRouteStops(trip.trip_id, trip.origin?.stop_id, open);
  const rows = routeStopRows(state.stops);
  const currentDrop = trip.destination?.stop_code || '';

  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-navy-800 hover:text-navy-950"
      >
        {open ? 'Hide route stops' : 'View route stops'}
        <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div id={panelId} className="mt-3" data-testid="route-stops">
          {state.loading && <SkeletonList label="Loading stops..." rows={3} />}
          {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
          {!state.loading && !state.error && rows.length === 0 && <p className="text-sm text-slate-500">No stops listed for this trip.</p>}
          {rows.length > 0 && (
            <ol className="space-y-1" aria-label="Route stops">
              {rows.map((row) => {
                const isDrop = row.code && row.code === currentDrop;
                return (
                  <li key={row.key} data-testid="route-stop" className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 ${row.before ? 'opacity-50' : ''} ${isDrop ? 'bg-amber-50' : ''}`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="font-data w-12 shrink-0 text-xs font-semibold text-teal-700">{row.time || 'Not provided'}</span>
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.passesOnly ? 'bg-slate-200' : row.boarding ? 'bg-navy-700' : isDrop ? 'bg-amber-400' : 'border-2 border-slate-400 bg-white'}`} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-sm text-navy-950">{row.name}</span>
                        {row.boarding && <span className="block text-xs font-semibold text-navy-700">You board here</span>}
                        {row.passesOnly && <span className="block text-xs text-slate-500">Passes by only</span>}
                        {isDrop && <span className="block text-xs font-semibold text-amber-700">Your drop-off</span>}
                      </span>
                    </div>
                    {row.choosable && !isDrop && (
                      <button
                        type="button"
                        onClick={() => onChooseDropOff(trip, row.code)}
                        aria-label={`Get off at ${row.name}`}
                        className="min-h-8 shrink-0 rounded-full border border-teal-300 px-3 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                      >
                        Get off here
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
