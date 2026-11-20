import { X } from 'lucide-react';
import useStopArrivals from '../../../api/hooks/Passenger/useStopArrivals';
import { busParts, etaBand, etaText, expectedAndEta, groupByDestination, updatedText } from '../../../utils/stopArrivals';

function ArrivalRow({ arrival }) {
  const band = etaBand(arrival);
  const bus = busParts(arrival);
  return (
    <li className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="break-words text-sm font-bold text-slate-900" data-testid="arrival-body-no">{bus.title}</p>
        {bus.subtitle && <p className="break-words text-xs text-slate-600">{bus.subtitle}</p>}
        <p className="mt-0.5 text-xs font-semibold text-slate-700" data-testid="arrival-times">{expectedAndEta(arrival)}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-data text-base font-bold text-navy-950">{etaText(arrival)}</p>
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${band.tone}`}>{band.label}</span>
      </div>
    </li>
  );
}

/** One "To {destination}" group of buses, soonest first. */
function DestinationGroups({ arrivals, testId }) {
  return (
    <div className="mt-2 space-y-3" data-testid={testId}>
      {groupByDestination(arrivals).map((group) => (
        <div key={group.destination} className="rounded-xl border border-slate-100 px-3" data-testid="arrival-group">
          <p className="border-b border-slate-100 py-2 text-xs font-semibold uppercase tracking-wide text-teal-700">To {group.destination}</p>
          <ul className="divide-y divide-slate-100">
            {group.arrivals.map((arrival) => <ArrivalRow key={arrival.trip_id} arrival={arrival} />)}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * Batch 77 (user, 2026-11-17): the card of a clicked stop pin on Track Bus: the stop's name and the buses coming there,
 * each with body number, company, "Expected {time} · ETA {time}" (Batch 79), minutes and a band, whether the times are
 * live, and when they were last updated. 2026-11-20 (user: two buses from the same terminal, only one showed): every
 * bus due in the next few hours, grouped by destination ("To {destination}" for each), then the buses due later today;
 * the card scrolls instead of growing past the map. A floating card over the map on wide screens, a bottom sheet on
 * phones. Every value comes from the server (StopArrivalsService).
 */
export default function StopArrivalsCard({ stop, onClose, onViewTrips }) {
  const { loading, data, error } = useStopArrivals(stop?.code);
  if (!stop) return null;
  const arrivals = data?.arrivals || [];
  const later = data?.later || [];
  const anyLive = arrivals.some((arrival) => arrival.live);

  return (
    <section
      aria-label={`Next arrivals at ${data?.stop?.name || stop.name}`}
      data-testid="stop-arrivals-card"
      className="fixed inset-x-0 bottom-0 z-30 max-h-[70vh] overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 shadow-card-hover sm:absolute sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-3 sm:max-h-none sm:w-96 sm:rounded-2xl"
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
        <p className="text-sm font-semibold text-navy-950">Next arrivals{arrivals.length > 0 ? ` (${arrivals.length})` : ''}</p>
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

      {arrivals.length > 0 && <DestinationGroups arrivals={arrivals} testId="arrivals-list" />}

      {later.length > 0 && (
        <div className="mt-4" data-testid="arrivals-later">
          <p className="text-sm font-semibold text-navy-950">Later today ({later.length})</p>
          <DestinationGroups arrivals={later} testId="arrivals-later-list" />
        </div>
      )}

      {data?.updated_at && <p className="mt-2 text-xs text-slate-500">{updatedText(data.updated_at)}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onViewTrips?.(stop.code)} className="rounded-full bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-900" data-testid="stop-pin-trips">
          View available trips from {data?.stop?.name || stop.name}
        </button>
      </div>
    </section>
  );
}
