import { useEffect, useState } from 'react';

/**
 * Batch 75 (panel, 2026-11-15): the Operator's fare table for one bus on a route. `filters` = { fleetRouteId,
 * direction, serviceType, originStopId }; nothing loads until a bus is chosen.
 */
export default function useRouteFareTable({ service, routeId, filters }) {
  const [state, setState] = useState({ loading: false, error: '', table: null });
  const { fleetRouteId, direction, serviceType, originStopId } = filters;

  useEffect(() => {
    if (!routeId || !fleetRouteId || typeof service?.getRouteFareTable !== 'function') return undefined;
    let active = true;
    const timer = setTimeout(() => {
      setState((prev) => ({ ...prev, loading: true, error: '' }));
      service.getRouteFareTable(routeId, {
        fleet_route_id: fleetRouteId,
        direction,
        service_type: serviceType,
        ...(originStopId ? { origin_stop_id: originStopId } : {}),
      })
        .then((res) => { if (active) setState({ loading: false, error: '', table: res?.data ?? null }); })
        .catch((err) => { if (active) setState({ loading: false, error: err?.message || 'Could not load the fares.', table: null }); });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [service, routeId, fleetRouteId, direction, serviceType, originStopId]);

  return state;
}
