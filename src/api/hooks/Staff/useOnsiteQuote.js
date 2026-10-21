import { useEffect, useState } from 'react';
import ConductorService from '../../StaffService/ConductorService';
import { buildOnsiteItem } from '../../../utils/cashTicket';

/**
 * The exact fare of the cash sale being filled in, asked of the server as soon as the boarding point and the destination
 * are chosen (the Conductor needs the amount to tell the passenger what to pay). The server prices it with the same rules
 * as the sale itself. `status` is idle (form not complete), loading, ready or error.
 *
 * `refreshKey` asks again for the same form, for example after the bus position was refreshed.
 */
export default function useOnsiteQuote({ tripId, form, ready, refreshKey = 0 }) {
  const [answer, setAnswer] = useState({ key: '', amount: null, message: '' });
  const key = ready && tripId ? JSON.stringify([tripId, form.seat_type, form.boarding_mode, form.origin_stop_id, form.destination_stop_id, refreshKey]) : '';

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    ConductorService.quoteOnsite(buildOnsiteItem({ tripId, form }))
      .then((response) => {
        const amount = Number((response?.data ?? response)?.amount);
        if (!cancelled) setAnswer({ key, amount: Number.isFinite(amount) ? amount : null, message: Number.isFinite(amount) ? '' : 'The fare could not be read. Try again.' });
      })
      .catch((error) => {
        if (!cancelled) setAnswer({ key, amount: null, message: error?.message || 'The fare could not be worked out. Try again.' });
      });
    return () => { cancelled = true; };
    // The key already holds every field of the form the quote depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!key) return { status: 'idle', amount: null, message: '' };
  if (answer.key !== key) return { status: 'loading', amount: null, message: '' };
  return answer.amount === null
    ? { status: 'error', amount: null, message: answer.message }
    : { status: 'ready', amount: answer.amount, message: '' };
}
