import { useCallback, useEffect, useState } from 'react';

/**
 * C8: role-scoped calendar quick summary (today / this week / next item, plus
 * the Operator's "For Approval" count). The server owns the Manila day/week
 * boundaries; this hook only fetches and refreshes.
 */
export function useCalendarSummary(service, refreshKey = 0) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await service.getCalendarSummary();
      setSummary(res?.data ?? null);
      setError(false);
    } catch {
      setError(true);
    }
  }, [service]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    const interval = setInterval(() => { void load(); }, 60000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [load, refreshKey]);

  return { summary, error };
}
