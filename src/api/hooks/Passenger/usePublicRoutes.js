import { useEffect, useState } from 'react';
import { getProvinceRoutes, getPublicRoute, getPublicRouteStops, getRouteDepartures } from '../../../services/publicRouteService';
import { readApiError } from '../../../services/bookingService';

const DEPARTURES_REFRESH_MS = 60000;

/** 2026-11-20 (user): the routes serving a province (its homepage picture). */
export function useProvinceRoutes(province) {
  const [state, setState] = useState({ key: '', data: null, error: '' });

  useEffect(() => {
    if (!province) return undefined;
    let cancelled = false;
    getProvinceRoutes(province)
      .then((data) => { if (!cancelled) setState({ key: province, data, error: '' }); })
      .catch((error) => { if (!cancelled) setState({ key: province, data: null, error: readApiError(error, 'Routes could not be loaded.').message }); });
    return () => { cancelled = true; };
  }, [province]);

  if (!province) return { loading: false, data: null, error: '' };
  return state.key === province ? { loading: false, data: state.data, error: state.error } : { loading: true, data: null, error: '' };
}

/** 2026-11-20 (user): one route's page: the route, its stops, and today's departures (asked again every minute). */
export function useRoutePage(routeId) {
  const [state, setState] = useState({ key: '', route: null, stops: [], departures: [], error: '' });

  useEffect(() => {
    if (!routeId) return undefined;
    let cancelled = false;
    Promise.all([getPublicRoute(routeId), getPublicRouteStops(routeId), getRouteDepartures(routeId)])
      .then(([route, stops, departures]) => {
        if (!cancelled) setState({ key: String(routeId), route, stops: Array.isArray(stops) ? stops : [], departures: departures?.departures ?? [], error: '' });
      })
      .catch((error) => {
        if (!cancelled) setState({ key: String(routeId), route: null, stops: [], departures: [], error: readApiError(error, 'This route could not be loaded.').message });
      });
    const timer = setInterval(() => {
      getRouteDepartures(routeId)
        .then((departures) => { if (!cancelled) setState((prev) => ({ ...prev, departures: departures?.departures ?? prev.departures })); })
        .catch(() => {});
    }, DEPARTURES_REFRESH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [routeId]);

  if (!routeId) return { loading: false, route: null, stops: [], departures: [], error: '' };
  return state.key === String(routeId)
    ? { loading: false, route: state.route, stops: state.stops, departures: state.departures, error: state.error }
    : { loading: true, route: null, stops: [], departures: [], error: '' };
}
