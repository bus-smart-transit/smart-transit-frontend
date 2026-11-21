import { useEffect, useState } from 'react';
import OperatorService from '../../StaffService/OperatorService';

const DEBOUNCE_MS = 300;

/**
 * 2026-11-21 (user, Dynamic Route Scheduling): the company's buses for the scheduling form, each saying whether it can
 * take a trip on this route at this date and time (and why not). Nothing loads until all three are chosen.
 */
export default function useBusAvailability({ routeId, date, time, serviceType }) {
  const key = routeId && date && time ? [routeId, date, time, serviceType || 'regular'].join('|') : '';
  const [state, setState] = useState({ key: '', buses: [], error: '' });

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      OperatorService.getBusAvailability({ route_id: routeId, trip_date: date, departure_time: time, service_type: serviceType || 'regular' })
        .then((res) => { if (!cancelled) setState({ key, buses: Array.isArray(res?.data) ? res.data : [], error: '' }); })
        .catch((err) => { if (!cancelled) setState({ key, buses: [], error: err?.message || 'Bus availability could not be checked.' }); });
    }, DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [key, routeId, date, time, serviceType]);

  if (!key) return { ready: false, loading: false, buses: [], error: '' };
  return state.key === key
    ? { ready: true, loading: false, buses: state.buses, error: state.error }
    : { ready: true, loading: true, buses: [], error: '' };
}
