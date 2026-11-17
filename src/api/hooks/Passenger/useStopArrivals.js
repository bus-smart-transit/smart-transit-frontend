import { useEffect, useState } from 'react';
import { getStopArrivals, readApiError } from '../../../services/bookingService';

const REFRESH_MS = 20000;

/**
 * Batch 77 (user, 2026-11-17): the buses coming to the stop whose pin was clicked on Track Bus, asked again every 20 s
 * while the card is open. `all` asks for the full list ("View all arrivals").
 */
export default function useStopArrivals(stopCode, all = false) {
  const [state, setState] = useState({ key: '', data: null, error: '' });
  const key = stopCode ? `${stopCode}|${all ? 'all' : 'first'}` : '';

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    const load = () => getStopArrivals(stopCode, all ? 20 : null)
      .then((data) => { if (!cancelled) setState({ key, data, error: '' }); })
      .catch((error) => { if (!cancelled) setState((prev) => ({ key, data: prev.key === key ? prev.data : null, error: readApiError(error, 'Arrivals could not be loaded.').message })); });
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [key, stopCode, all]);

  if (!key) return { loading: false, data: null, error: '' };
  if (state.key !== key) return { loading: true, data: null, error: '' };
  return { loading: false, data: state.data, error: state.error };
}
