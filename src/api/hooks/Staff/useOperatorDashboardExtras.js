import { useState, useEffect, useCallback } from 'react';
import OperatorService from '../../StaffService/OperatorService';
import { getBusinessToday } from '../../../utils/dates';

/**
 * Batch 31: data hooks for the reworked Operator Dashboard and Fleets pages. The page components only render.
 */

export { useNow } from '../useNow';

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
 * Records the Operator's decision on a trip. "contact" also sends the authored message to assigned crew;
 * no bus is assigned or rerouted by any decision.
 */
export function useDispatchAdvice({ onSaved } = {}) {
  const [savingTripId, setSavingTripId] = useState(null);
  const [error, setError] = useState('');

  const decide = useCallback(async (tripId, decision, payload) => {
    setSavingTripId(tripId);
    setError('');
    try {
      await OperatorService.saveDispatchDecision(tripId, { ...payload, decision });
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

/** §4.8: the crew's time in / time out on one Manila date (default today), read only. */
/**
 * Batch 46: the time in / out table over a range (From..To, at most 31 days), one staff member or all, one page.
 * The server makes the rows, the hours and the totals per person; nothing is worked out here.
 */
export function useCrewShiftRange({ from, to, staffId, page }) {
  const [state, setState] = useState({ loading: true, error: '', shifts: [], totals: [], pagination: { page: 1, per_page: 20, total: 0, last_page: 1 } });

  useEffect(() => {
    let cancelled = false;
    OperatorService.getCrewShiftRange({ from, to, staffId, page })
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? {};
        setState({ loading: false, error: '', shifts: data.shifts ?? [], totals: data.totals ?? [], pagination: data.pagination ?? { page: 1, per_page: 20, total: 0, last_page: 1 } });
      })
      .catch((err) => { if (!cancelled) setState((prev) => ({ ...prev, loading: false, error: err?.message || 'Could not load the crew times.' })); });
    return () => { cancelled = true; };
  }, [from, to, staffId, page]);

  return state;
}

/**
 * 2026-11-13: trips per business day over the last `days` days (today last), from the calendar markers, for the
 * Trips today card's trend line and its change against yesterday. The calendar does not count cancelled trips, so
 * today and yesterday are both read from here to compare like with like. A failed load leaves `days` empty.
 */
export function useTripsPerDay(days = 7, refreshKey = null) {
  const [state, setState] = useState({ days: [] });
  useEffect(() => {
    let cancelled = false;
    const to = getBusinessToday();
    const from = addDays(to, -(days - 1));
    Promise.resolve()
      .then(() => OperatorService.getCalendarDays({ from, to }))
      .then((res) => {
        if (cancelled) return;
        const byDate = new Map((res?.data?.days ?? []).map((day) => [day.date, Number(day.trips) || 0]));
        setState({ days: Array.from({ length: days }, (_, i) => { const date = addDays(from, i); return { date, trips: byDate.get(date) ?? 0 }; }) });
      })
      .catch(() => { if (!cancelled) setState({ days: [] }); });
    return () => { cancelled = true; };
  }, [days, refreshKey]);
  return state.days;
}
