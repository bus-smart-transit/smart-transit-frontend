import { driverEtaMinutes, placeInMinutes } from '../../../utils/busEta';

/**
 * Traffic to the next stop. 2026-11-13 (user): it lives inside the Route Navigation card, under the map, instead of
 * having its own card. Values come from the server's traffic check; a missing value reads "Not available".
 */
export default function RouteConditions({ trafficStatus, nextStop }) {
  const unavailable = trafficStatus.dataSource === 'fallback';
  const badgeLabel = unavailable
    ? 'Unavailable'
    : trafficStatus.level === 'unknown'
      ? 'Travel time only'
      : trafficStatus.label;
  const badgeTone = unavailable || trafficStatus.level === 'unknown'
    ? 'bg-slate-100 text-slate-700'
    : trafficStatus.level === 'heavy'
      ? 'bg-red-100 text-red-700'
      : trafficStatus.level === 'moderate'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-emerald-100 text-emerald-700';
  const eta = driverEtaMinutes(trafficStatus, nextStop);

  return (
    <div className="mt-4 border-t border-slate-200 pt-4" data-testid="route-conditions">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Route conditions</p>
          <h5 className="text-base font-bold text-slate-900">Traffic to next stop</h5>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${badgeTone}`}>{badgeLabel}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ETA</p>
          <p className="mt-1 font-data text-lg font-bold text-slate-900">{eta == null ? <span className="text-sm">Not available</span> : `${eta} min`}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Extra time</p>
          <p className="mt-1 font-data text-lg font-bold text-slate-900">{trafficStatus.delayMinutes == null ? <span className="text-sm">Not available</span> : `${trafficStatus.delayMinutes} min`}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next stop</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{nextStop ? placeInMinutes(nextStop?.stop_name ?? nextStop?.name, eta) : 'No pending stop'}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-700">{trafficStatus.suggestion}</p>
      <p className="mt-2 text-xs text-slate-500">
        Measured: {trafficStatus.segmentLabel || `Current position to ${nextStop?.stop_name ?? nextStop?.name ?? 'next stop'}`}
        {' · '}
        {trafficStatus.updatedAt
          ? `Updated ${new Date(trafficStatus.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'No live update time'}
      </p>
    </div>
  );
}
