import { useCallback, useState } from 'react';
import { getTracking } from '../../../services/trackingService';
import { extractTrackingToken } from '../../../utils/trackingToken';

/**
 * Batch 45 Feature C: the "Track my bus" pop-up. Step 1 takes the tracking code or link from the ticket; the server
 * checks it (GET track/{token}, the same read the tracking page makes, with its own limit); step 2 shows which trip it
 * is so the passenger confirms before the tracking page opens. There is no lookup by bus code (decided).
 */
export default function useTrackMyBus() {
  const [code, setCode] = useState('');
  const [state, setState] = useState({ step: 'enter', loading: false, error: '', token: null, view: null });

  const reset = useCallback(() => {
    setCode('');
    setState({ step: 'enter', loading: false, error: '', token: null, view: null });
  }, []);

  const check = useCallback(async () => {
    const token = extractTrackingToken(code);
    if (!token) {
      setState((prev) => ({ ...prev, error: 'That does not look like a tracking code. Copy the whole link or code from your ticket.' }));
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const view = await getTracking(token);
      setState({ step: 'confirm', loading: false, error: '', token, view });
    } catch (err) {
      const status = err?.response?.status;
      const error = status === 429
        ? 'Too many tries. Please wait a few minutes and try again.'
        : status === 404
          ? 'We could not find a ticket with that code. Check that you copied all of it.'
          : 'We could not check that code right now. Please try again.';
      setState((prev) => ({ ...prev, loading: false, error }));
    }
  }, [code]);

  const back = useCallback(() => setState((prev) => ({ ...prev, step: 'enter', error: '' })), []);

  return { code, setCode, ...state, check, back, reset };
}
