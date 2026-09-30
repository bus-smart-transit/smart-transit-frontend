import { useEffect, useMemo, useState } from 'react';
import RouteMap from '../Map/RouteMap';

const ROUTE_STATUS_TEXT = {
  idle: 'No route assigned',
  loading: 'Loading route…',
  ready: '✓ Route loaded',
  no_geometry: 'Route path not generated yet',
  error: 'Route could not be loaded',
};

/**
 * Driver Route Navigation (B8), built on the shared RouteMap layer.
 *
 * - The line is the trip's canonical geometry for the current leg direction;
 *   the old dashed straight "reroute" overlay is gone.
 * - The driver's own fix is shown only when accurate enough; otherwise the map
 *   says "GPS signal weak", and when the fix is far from the route it says
 *   "Location not on route" with the distance. No connecting line is drawn.
 * - Header and progress come from the trip, its route and its acknowledged
 *   stops, never from constants.
 */
export default function DriverNavigationMap({ trip, stops = [], lastGpsRef }) {
  const route = trip?.fleet_route?.route;
  const routeId = route?.route_id ?? null;
  const isReturnLeg = trip?.leg_direction === 'reverse';
  const direction = isReturnLeg ? 'reverse' : 'outbound';
  const originLabel = (isReturnLeg ? route?.destination : route?.origin) || 'Origin';
  const destinationLabel = (isReturnLeg ? route?.origin : route?.destination) || 'Destination';

  const [vehicle, setVehicle] = useState(null);
  const [routeStatus, setRouteStatus] = useState('loading');

  useEffect(() => {
    // The GPS watcher keeps lastGpsRef fresh; sample it once a second.
    const id = setInterval(() => {
      const fix = lastGpsRef?.current;
      setVehicle((prev) => {
        if (!fix) return prev === null ? prev : null;
        if (prev && prev.recordedAt === fix.recordedAt && prev.latitude === fix.latitude && prev.longitude === fix.longitude) {
          return prev;
        }
        return {
          latitude: fix.latitude,
          longitude: fix.longitude,
          accuracy: fix.accuracy,
          recordedAt: fix.recordedAt,
        };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lastGpsRef]);

  const acknowledgedStopIds = useMemo(
    () => (Array.isArray(stops) ? stops : []).filter((s) => s?.is_acknowledged).map((s) => Number(s?.stop_id)),
    [stops],
  );

  const completed = acknowledgedStopIds.length;
  const total = Array.isArray(stops) ? stops.length : 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-2">
        <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-400" />
        <span className="text-sm font-semibold text-slate-100">{originLabel}</span>
        <span className="text-slate-500">→</span>
        <span className="h-3 w-3 shrink-0 rounded-full bg-red-400" />
        <span className="text-sm font-semibold text-slate-100">{destinationLabel}</span>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
          {isReturnLeg ? 'Return leg' : 'Outbound leg'}
        </span>
        <span className="ml-auto text-xs text-slate-400">{ROUTE_STATUS_TEXT[routeStatus] || ''}</span>
      </div>
      <RouteMap
        routeId={routeId}
        direction={direction}
        vehicle={vehicle}
        acknowledgedStopIds={acknowledgedStopIds}
        onRouteStatus={setRouteStatus}
        className="relative h-105 w-full"
      />
      <div className="flex flex-wrap gap-4 border-t border-slate-800 px-4 py-2 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-teal-600" />Your position</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-teal-400" />Completed stop</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-sky-600" />Upcoming stop</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-blue-900" />Terminal</span>
        {total > 0 && (
          <span className="ml-auto">
            {completed} of {total} Stops Completed — {Math.round((completed / total) * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
