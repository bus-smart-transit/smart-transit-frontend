import { useState, useEffect, useCallback } from 'react';
import OperatorService from '../../StaffService/OperatorService';
import { getBusinessToday } from '../../../utils/dates';

/**
 * Batch 31: data hooks for the reworked Operator Dashboard and Fleets pages. The page components only render.
 */

/** Every fleet's last reported position (one row per fleet), refreshed on an interval while the tab is visible. */
export function useFleetLocations({ intervalMs = 20000 } = {}) {
  const [locations, setLocations] = useState([]);
  const [loadedAt, setLoadedAt] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res = await OperatorService.getFleetLocations();
      setLocations(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setLocations([]);
    } finally {
      setLoadedAt(Date.now());
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => { void refresh(); }, 0);
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void refresh();
    }, intervalMs);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [refresh, intervalMs]);

  return { locations, loadedAt, refresh };
}

/**
 * Records the Operator's decision on a trip ("accept" = advice acknowledged, "keep" = kept the current route).
 * The backend stores the decision and writes an audit entry; nothing is dispatched or rerouted by it.
 */
export function useDispatchAdvice({ onSaved } = {}) {
  const [savingTripId, setSavingTripId] = useState(null);
  const [error, setError] = useState('');

  const decide = useCallback(async (tripId, decision, { route, reason }) => {
    setSavingTripId(tripId);
    setError('');
    try {
      await OperatorService.saveDispatchDecision(tripId, { decision, route, reason });
      onSaved?.();
    } catch (err) {
      setError(err?.message || 'Could not save the decision.');
    } finally {
      setSavingTripId(null);
    }
  }, [onSaved]);

  return { savingTripId, error, decide };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Route adherence from the backend's GPS report (stop coverage per trip, per fleet). It is asked for once per fleet
 * for the last `days` days and is only as complete as the GPS history: trips with no GPS points are not counted.
 */
export function useRouteAdherence(fleets, { days = 7 } = {}) {
  const [state, setState] = useState({ loading: true, rows: [], error: false });
  const fleetKey = fleets.map((fleet) => fleet.fleet_id).join(',');

  useEffect(() => {
    if (!fleetKey) {
      const timer = setTimeout(() => setState({ loading: false, rows: [], error: false }), 0);
      return () => clearTimeout(timer);
    }
    let cancelled = false;
    const end = getBusinessToday();
    const start = addDays(end, -(days - 1));
    const timer = setTimeout(() => {
      void (async () => {
        const results = await Promise.allSettled(
          fleets.map((fleet) => OperatorService.getRouteAdherence(fleet.fleet_id, { start_date: start, end_date: end })),
        );
        if (cancelled) return;
        const rows = results.map((result, index) => {
          const summary = result.status === 'fulfilled' ? result.value?.data?.summary : null;
          return {
            fleetId: fleets[index].fleet_id,
            plate: fleets[index].plate_number,
            ok: result.status === 'fulfilled',
            tripsWithGps: Number(summary?.trips_with_gps_data ?? 0),
            deviated: Number(summary?.deviated_trips ?? 0),
            ratePct: summary?.adherence_rate_pct ?? null,
          };
        });
        setState({ loading: false, rows, error: rows.length > 0 && rows.every((row) => !row.ok) });
      })();
    }, 0);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fleetKey, days]);

  return state;
}
