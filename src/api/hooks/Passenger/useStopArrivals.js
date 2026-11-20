import { useEffect, useState } from 'react';
import { getStopArrivals, readApiError } from '../../../services/bookingService';

const REFRESH_MS = 20000;

/**
 * Batch 77 (user, 2026-11-17): the buses coming to the stop whose pin was clicked on Track Bus, asked again every 20 s
 * while the card is open. 2026-11-20 (user): always every arrival (up to the server's 20) and the ones later today.
 */
const ALL_ARRIVALS = 20;

export default function useStopArrivals(stopCode) {
  const [state, setState] = useState({ key: '', data: null, error: '' });
  const key = stopCode || '';

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    const load = () => getStopArrivals(stopCode, ALL_ARRIVALS)
      .then((data) => { if (!cancelled) setState({ key, data, error: '' }); })
      .catch((error) => { if (!cancelled) setState((prev) => ({ key, data: prev.key === key ? prev.data : null, error: readApiError(error, 'Arrivals could not be loaded.').message })); });
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [key, stopCode]);

  if (!key) return { loading: false, data: null, error: '' };
  if (state.key !== key) return { loading: true, data: null, error: '' };
  return { loading: false, data: state.data, error: state.error };
}
