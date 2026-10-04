import { useCallback, useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { queueActions, queueStateText } from '../../utils/ticketResolutionQueue';

const TONES = {
  light: { card: 'rounded-2xl border border-slate-200 bg-white p-4', title: 'text-slate-900', muted: 'text-slate-500', head: 'text-slate-500', row: 'border-t border-slate-100 text-slate-700', input: 'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900', btn: 'rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200' },
  dark: { card: 'rounded-2xl border border-slate-700 bg-[#101a30] p-4', title: 'text-white', muted: 'text-slate-400', head: 'text-slate-400', row: 'border-t border-slate-700/70 text-slate-200', input: 'rounded-lg border border-slate-600 bg-[#0B1324] px-2 py-1.5 text-sm text-white', btn: 'rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-600' },
};

/**
 * Batch 28 Stage 3, item 6: an Operator (or Admin) cancels a trip, before it leaves or while it runs. Every paid, unused
 * ticket then waits for its passenger's choice; nothing is refunded by itself. `service.cancelTrip(tripId, reason)`.
 */
export function CancelTripModal({ trip, service, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!trip) return null;

  const started = ['departed', 'in-progress'].includes(trip.status);
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await service.cancelTrip(trip.trip_id, reason.trim());
      onDone?.(`Trip #${trip.trip_id} cancelled. Passengers with paid tickets were told and can rebook or ask for a refund.`);
      onClose();
    } catch (err) {
      setError(err?.message || 'The trip could not be cancelled.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Cancel trip #${trip.trip_id}?`}>
      <div className="space-y-3 text-sm text-slate-700" data-testid="cancel-trip-modal">
        <p>Passengers who paid for this trip are told, and each one can rebook on a later departure or ask for a refund. Nothing is refunded automatically.</p>
        {started && <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">This trip has already left. A passenger who boarded gets back the fare for the part of the journey the bus did not cover, worked out by the server from the last stop acknowledged or the last GPS position.</p>}
        <label className="block font-medium">
          Reason (optional)
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        {error && <p role="alert" className="text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Keep the trip</button>
          <button type="button" onClick={submit} disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60">{busy ? 'Cancelling...' : 'Cancel the trip'}</button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * The tickets of cancelled trips that need staff: waiting for a choice (act for a passenger at the counter), a refund the
 * server could not price (set it, with a reason), a cash refund to hand over and record, or a refund that failed.
 * A digital ticket is always refunded to its original payment method; there is no cash option for it.
 */
export function TicketResolutionQueue({ service, tone = 'light' }) {
  const t = TONES[tone] || TONES.light;
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [review, setReview] = useState({ amount: '', note: '' });

  const load = useCallback(async () => {
    try {
      const res = await service.getTicketResolutions();
      setRows(Array.isArray(res?.data) ? res.data : []);
      setError('');
    } catch (err) {
      setError(err?.message || 'The list could not be loaded.');
    }
  }, [service]);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const run = async (row, label, call) => {
    setBusyId(row.ticket_uuid);
    setMessage('');
    setError('');
    try {
      await call();
      setMessage(`${label} done for ticket ${String(row.ticket_uuid).slice(0, 8).toUpperCase()}.`);
      await load();
    } catch (err) {
      setError(err?.message || `${label} failed. Nothing was changed.`);
    } finally {
      setBusyId(null);
    }
  };

  const act = (row, action) => {
    if (action === 'rebook') return run(row, 'Rebook', () => service.chooseStaffTicketResolution(row.ticket_uuid, { choice: 'rebook', note: 'Staff-assisted' }));
    if (action === 'refund' || action === 'retry') return run(row, action === 'retry' ? 'Retry' : 'Refund', () => service.chooseStaffTicketResolution(row.ticket_uuid, { choice: 'refund', note: 'Staff-assisted' }));
    if (action === 'cash') return run(row, 'Cash refund entry', () => service.recordCashRefund(row.resolution.id, 'Handed back at the terminal'));
    if (action === 'review') {
      setReviewing(row);
      setReview({ amount: '', note: '' });
    }
    return undefined;
  };

  const submitReview = () => run(reviewing, 'Refund amount', async () => {
    await service.reviewRefund(reviewing.resolution.id, Number(review.amount), review.note.trim());
    setReviewing(null);
  });

  const LABELS = { rebook: 'Rebook for passenger', refund: 'Refund for passenger', review: 'Set amount', cash: 'Record cash refund', retry: 'Retry refund' };

  return (
    <section className={t.card} data-testid="ticket-resolution-queue">
      <h3 className={`text-sm font-semibold uppercase tracking-[0.14em] ${t.title}`}>Cancelled trips: tickets needing attention</h3>
      <p className={`mt-1 text-xs ${t.muted}`}>Passengers choose in their app. Use these actions when a passenger asks you at the terminal. A digital ticket is refunded to the original payment method only, never in cash.</p>
      {message && <p role="status" className="mt-2 text-sm text-emerald-600">{message}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-500">{error}</p>}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-xs">
          <thead className={t.head}>
            <tr>{['Ticket', 'Trip', 'Passenger', 'Fare paid', 'Pays by', 'State', 'Action'].map((h) => <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className={`px-2 py-4 text-center ${t.muted}`}>No cancelled-trip tickets need attention.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.ticket_uuid} className={t.row} data-testid="resolution-row">
                <td className="px-2 py-1.5 font-mono">{String(row.ticket_uuid).slice(0, 8).toUpperCase()}</td>
                <td className="px-2 py-1.5">#{row.trip_id} &middot; {row.route_name} &middot; {row.trip_date}</td>
                <td className="px-2 py-1.5">{row.passenger_name || row.guest_email || 'Guest'}</td>
                <td className="px-2 py-1.5">PHP {Number(row.fare_paid).toFixed(2)}</td>
                <td className="px-2 py-1.5">{row.method === 'cash' ? 'Cash' : 'GCash / Maya / card'}</td>
                <td className="px-2 py-1.5">{queueStateText(row)}</td>
                <td className="px-2 py-1.5">
                  <div className="flex flex-wrap gap-1">
                    {queueActions(row).map((action) => (
                      <button key={action} type="button" disabled={busyId === row.ticket_uuid} onClick={() => act(row, action)} className={t.btn}>{LABELS[action]}</button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={Boolean(reviewing)} onClose={() => setReviewing(null)} title="Set the refund amount">
        <div className="space-y-3 text-sm text-slate-700" data-testid="review-form">
          <p>The travelled part of this ticket could not be priced. Enter what to refund, at most the fare paid (PHP {Number(reviewing?.fare_paid ?? 0).toFixed(2)}), and say why. It is recorded with your name.</p>
          <label className="block font-medium">Refund amount (PHP)
            <input type="number" min="0" step="1" value={review.amount} onChange={(e) => setReview((p) => ({ ...p, amount: e.target.value }))} className={`mt-1 w-full ${TONES.light.input}`} />
          </label>
          <label className="block font-medium">Reason
            <input value={review.note} maxLength={255} onChange={(e) => setReview((p) => ({ ...p, note: e.target.value }))} className={`mt-1 w-full ${TONES.light.input}`} />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setReviewing(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button>
            <button type="button" disabled={review.amount === '' || !review.note.trim() || busyId !== null} onClick={submitReview} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save and refund</button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

export default TicketResolutionQueue;
