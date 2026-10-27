import { useEffect, useState } from 'react';
import ConductorService from '../../StaffService/ConductorService';
import { buildOnsiteItem } from '../../../utils/cashTicket';

/**
 * The exact fare of the cash sale being filled in, asked of the server as soon as the boarding point and the destination
 * are chosen (the Conductor needs the amount to tell the passenger what to pay). The server prices it with the same rules
 * as the sale itself. `status` is idle (form not complete), loading, ready or error.
 *
 * `refreshKey` asks again for the same form, for example after the bus position was refreshed.
 * `discount` ({ discount_type_key, discount_id_checked }, 2026-10-27): the quote includes an onsite discount once the
 * Chauffeur has ticked the ID check, so the fare shown is the fare the sale charges.
 */
export default function useOnsiteQuote({ tripId, form, ready, refreshKey = 0, discount = null }) {
  const [answer, setAnswer] = useState({ key: '', amount: null, message: '' });
  const discountKey = discount?.discount_type_key && discount?.discount_id_checked ? discount.discount_type_key : '';
  const key = ready && tripId ? JSON.stringify([tripId, form.seat_type, form.boarding_mode, form.origin_stop_id, form.pending_boarding_id, form.destination_stop_id, discountKey, refreshKey]) : '';

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    const item = buildOnsiteItem({ tripId, form });
    if (discountKey) {
      item.discount_type_key = discountKey;
      item.discount_id_checked = true;
    }
    ConductorService.quoteOnsite(item)
      .then((response) => {
        const data = response?.data ?? response;
        const amount = Number(data?.amount);
        const ok = Number.isFinite(amount);
        if (!cancelled) {
          setAnswer({
            key,
            amount: ok ? amount : null,
            originalAmount: data?.original_amount != null ? Number(data.original_amount) : null,
            discountAmount: data?.discount_amount != null ? Number(data.discount_amount) : null,
            discountLabel: data?.discount_label ?? null,
            message: ok ? '' : 'The fare could not be read. Try again.',
          });
        }
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
    : {
      status: 'ready',
      amount: answer.amount,
      originalAmount: answer.originalAmount ?? null,
      discountAmount: answer.discountAmount ?? null,
      discountLabel: answer.discountLabel ?? null,
      message: '',
    };
}
