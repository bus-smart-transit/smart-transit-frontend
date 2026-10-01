import { useCallback, useEffect, useState } from 'react';
import { buildCalendarGrid } from '../../../utils/calendarGrid';

const readError = (error, fallback) => error?.message || fallback;

/**
 * The calendar's day markers for the month grid being shown, from the server (scoped to the caller's
 * own assignments, or the operator's fleets; Manila days). Returns the 42 grid cells with each cell's
 * `trips` / `shifts` counts, plus loading/error state. `refreshKey` reloads after the page changed data.
 */
export function useCalendarMonth(service, monthStart, refreshKey = 0) {
  const [state, setState] = useState({ key: null, byDate: {}, error: '' });
  const grid = buildCalendarGrid(monthStart, {});
  const from = grid[0].dateKey;
  const to = grid[grid.length - 1].dateKey;
  const key = `${from}|${to}|${refreshKey}`;

  useEffect(() => {
    let cancelled = false;
    service.getCalendarDays({ from, to })
      .then((res) => {
        if (cancelled) return;
        const byDate = {};
        (res?.data?.days ?? []).forEach((day) => { byDate[day.date] = day; });
        setState({ key, byDate, error: '' });
      })
      .catch((err) => { if (!cancelled) setState({ key, byDate: {}, error: readError(err, 'The calendar could not be loaded.') }); });
    return () => { cancelled = true; };
  }, [service, from, to, key]);

  const current = state.key === key;
  return {
    cells: grid.map((cell) => ({ ...cell, marker: current ? state.byDate[cell.dateKey] ?? null : null })),
    loading: !current,
    error: current ? state.error : '',
  };
}

/** One page of the trips and shifts of a single day, from the server. */
export function useCalendarDay(service, date, page = 1, refreshKey = 0) {
  const key = date ? `${date}|${page}|${refreshKey}` : null;
  const [state, setState] = useState({ key: null, data: null, error: '' });

  const load = useCallback(() => service.getCalendarDay({ date, page }), [service, date, page]);

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    load()
      .then((res) => { if (!cancelled) setState({ key, data: res?.data ?? null, error: '' }); })
      .catch((err) => { if (!cancelled) setState({ key, data: null, error: readError(err, 'This day could not be loaded.') }); });
    return () => { cancelled = true; };
  }, [key, load]);

  const current = state.key === key;
  const data = current ? state.data : null;
  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? page,
    lastPage: data?.last_page ?? 1,
    loading: key !== null && !current,
    error: current ? state.error : '',
  };
}
