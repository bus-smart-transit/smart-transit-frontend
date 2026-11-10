import { useEffect, useState } from 'react';
import { getTripTimeline, readApiError } from '../../../services/bookingService';

/**
 * Batch 54 (user, 2026-11-10): a trip's route stops for "View route stops", asked only once the panel is opened
 * (the list stays fast) and only once per trip and boarding stop.
 */
export default function useRouteStops(tripId, boardingStopId, open) {
  const key = open && tripId ? `${tripId}|${boardingStopId ?? ''}` : null;
  const [result, setResult] = useState({ key: null, stops: [], error: '' });

  useEffect(() => {
    if (!key || result.key === key) return undefined;
    let cancelled = false;
    getTripTimeline(tripId, boardingStopId ? { boarding_stop_id: boardingStopId } : {})
      .then((data) => { if (!cancelled) setResult({ key, stops: Array.isArray(data?.stops) ? data.stops : [], error: '' }); })
      .catch((err) => { if (!cancelled) setResult({ key, stops: [], error: readApiError(err, 'The stops could not be loaded.').message }); });
    return () => { cancelled = true; };
    // key encodes tripId and boardingStopId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = key !== null && result.key === key;
  return { stops: current ? result.stops : [], error: current ? result.error : '', loading: key !== null && !current };
}
