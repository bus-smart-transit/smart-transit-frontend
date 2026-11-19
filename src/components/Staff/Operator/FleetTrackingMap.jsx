import { useMemo } from 'react';
import RouteMap from '../../Map/RouteMap';

/**
 * The Operator's map for one bus: the shared RouteMap layer. The line is the assigned trip's canonical geometry (per
 * leg direction) and the bus is the server-projected, accuracy-filtered position, with an explicit no-GPS / stale /
 * weak / off-route state instead of a floating icon. (Moved here unchanged from OperatorDashboard.jsx in Batch 31.)
 */
export default function FleetTrackingMap({ trip, location, className = 'relative h-80 w-full sm:h-107.5' }) {
  const routeId = Number(location?.route_id ?? trip?.fleet_route?.route?.route_id);
  const vehicle = useMemo(() => (location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy_m,
        recordedAt: location.recorded_at || location.updated_at,
        routePosition: location.route_position,
      }
    : null), [location]);

  return (
    <RouteMap
      routeId={Number.isFinite(routeId) && routeId > 0 ? routeId : null}
      direction={location?.leg_direction || trip?.leg_direction || 'outbound'}
      vehicle={vehicle}
      className={className}
    />
  );
}
