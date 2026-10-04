import { useCallback, useEffect, useState } from 'react';
import { Loader, RefreshCcw, Undo2 } from 'lucide-react';
import PassengerService from '../../../api/PassengerService/PassengerService';
import Button from '../../ui/Button';
import { busLabelText } from '../../../utils/busLabel';
import { refundMethodText, resolutionSummary } from '../../../utils/ticketResolution';

/**
 * Batch 28 Stage 3, item 6: the ONE way a paid ticket can be given up: the OPERATOR cancelled the trip. The passenger
 * picks one of two things, each confirmed in a second step so a tap cannot settle a ticket by accident:
 *   - Rebook onto a later departure of the same route and stops, at no extra charge; or
 *   - Refund of the part of the fare for the journey that did not happen.
 * Every amount, option and state on this panel comes from the server; the choice is the only thing sent back.
 */
export default function TripCancelledChoice({ ticketUuid, onChanged }) {
  const [view, setView] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // 'rebook' | 'refund': waiting for the second tap
  const [tripId, setTripId] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await PassengerService.getTicketResolution(ticketUuid);
      const data = res?.data ?? res ?? null;
      setView(data);
      setTripId(String(data?.rebook?.options?.[0]?.trip_id ?? ''));
      setError('');
    } catch (err) {
      setError(err?.message || 'Could not load the options for this ticket.');
    } finally {
      setLoading(false);
    }
  }, [ticketUuid]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const submit = async (choice) => {
    setBusy(true);
    setError('');
    try {
      const body = choice === 'rebook' && tripId ? { choice, trip_id: Number(tripId) } : { choice };
      const res = await PassengerService.chooseTicketResolution(ticketUuid, body);
      setView(res?.data ?? res ?? null);
      setPending(null);
      if (onChanged) await onChanged();
    } catch (err) {
      setError(err?.message || 'Your choice could not be saved. Nothing was changed.');
      setPending(null);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500" data-testid="choice-loading">Loading your options...</p>;
  if (!view) return error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null;

  const settled = resolutionSummary(view.resolution);
  const refund = view.refund;
  const options = view.rebook?.options ?? [];

  return (
    <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4" data-testid="trip-cancelled-choice" aria-label="Trip cancelled">
      <h4 className="flex items-center gap-2 text-sm font-bold text-amber-900"><Undo2 size={16} aria-hidden="true" /> The operator cancelled this trip</h4>
      <p className="mt-1 text-xs text-amber-800">
        {view.trip?.route_name} on {view.trip?.trip_date}. You did not cancel it, so you can rebook or ask for your money back. Nothing is refunded until you choose.
      </p>

      {settled && (
        <p data-testid="choice-settled" className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-amber-200">{settled}</p>
      )}

      {view.awaiting_choice && !settled && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-white p-3 ring-1 ring-inset ring-slate-200">
            <p className="text-sm font-semibold text-navy-950">Rebook</p>
            {options.length > 0 ? (
              <fieldset className="mt-2 space-y-1.5" aria-label="Later departures">
                {options.map((option) => (
                  <label key={option.trip_id} className="flex cursor-pointer items-start gap-2 text-xs text-slate-700">
                    <input type="radio" name="rebook-trip" value={option.trip_id} checked={String(option.trip_id) === String(tripId)} onChange={() => setTripId(String(option.trip_id))} className="mt-0.5 accent-navy-800" />
                    <span>{option.trip_date} at {option.boarding_time} &middot; {busLabelText(option.bus_label)}</span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <p data-testid="no-rebook" className="mt-2 text-xs text-slate-600">{view.rebook?.message || 'No later departure is available.'}</p>
            )}
            <p className="mt-2 text-xs text-slate-500">Same stops, no extra charge.</p>
            {pending === 'rebook' ? (
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="primary" size="sm" disabled={busy} onClick={() => submit('rebook')}>{busy ? 'Saving...' : 'Confirm rebook'}</Button>
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setPending(null)}>Back</Button>
              </div>
            ) : (
              <Button type="button" className="mt-3" variant="primary" size="sm" disabled={options.length === 0 || busy} onClick={() => setPending('rebook')}>Rebook this ticket</Button>
            )}
          </div>

          <div className="rounded-lg bg-white p-3 ring-1 ring-inset ring-slate-200">
            <p className="text-sm font-semibold text-navy-950">Refund</p>
            {refund?.needs_review ? (
              <p data-testid="refund-review" className="mt-2 text-xs text-slate-600">The operator has to confirm your refund amount first. Ask for the refund and they will be told.</p>
            ) : (
              <p data-testid="refund-amount" className="mt-2 text-lg font-bold text-navy-950">PHP {Number(refund?.amount ?? 0).toFixed(2)}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">{refundMethodText(refund?.method)}</p>
            {refund && Number(refund.ridden_fare) > 0 && <p className="mt-1 text-xs text-slate-500">The fare for the part of the ride you already took (PHP {Number(refund.ridden_fare).toFixed(2)}) is not refunded.</p>}
            {pending === 'refund' ? (
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="primary" size="sm" disabled={busy} onClick={() => submit('refund')}>{busy ? 'Saving...' : 'Confirm refund'}</Button>
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setPending(null)}>Back</Button>
              </div>
            ) : (
              <Button type="button" className="mt-3" variant="outline" size="sm" disabled={busy} onClick={() => setPending('refund')}>Ask for a refund</Button>
            )}
          </div>
        </div>
      )}

      {view.awaiting_choice && view.deadline?.configured && (
        <p className="mt-2 text-xs text-amber-800" data-testid="choice-deadline">Please choose before {new Date(view.deadline.closes_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium' })}.</p>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      <button type="button" onClick={() => { setLoading(true); void load(); }} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-900 underline">
        {loading ? <Loader size={12} className="animate-spin" /> : <RefreshCcw size={12} aria-hidden="true" />} Refresh
      </button>
    </section>
  );
}
