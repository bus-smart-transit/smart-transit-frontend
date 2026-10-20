import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../ui/Card';
import usePaymentRefunds from '../../../api/hooks/Staff/usePaymentRefunds';
import { formatCount, formatPaidAt, formatPeso } from '../../../utils/financials';

const FIELD = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500';

const FILTERS = [['needs_refund', 'Needs refund'], ['outcome_unknown', 'Unknown checkout'], ['refunded', 'Refunded'], ['all', 'All']];

const STATUS_CHIP = {
  needs_refund: ['Needs refund', 'bg-red-100 text-red-700'],
  outcome_unknown: ['Outcome unknown', 'bg-amber-100 text-amber-800'],
  refunded: ['Refunded', 'bg-emerald-100 text-emerald-700'],
};

const CHANNEL = { gcash: 'GCash', maya: 'Maya', paymaya: 'Maya' };

function tripLine(trip) {
  const when = [trip.trip_date, trip.departure_time ? String(trip.departure_time).slice(0, 5) : null].filter(Boolean).join(' ');
  return `${trip.route_name || 'Route unavailable'}${when ? `, ${when}` : ''} (${formatCount(trip.tickets)} ticket${trip.tickets === 1 ? '' : 's'})`;
}

function RefundCard({ row, busy, error, onRecord, onReconcile }) {
  const [note, setNote] = useState('');
  const [confirmedNotCharged, setConfirmedNotCharged] = useState(false);
  const waiting = row.status === 'needs_refund';
  const outcomeUnknown = row.reconciliation_status === 'outcome_unknown';
  const displayStatus = outcomeUnknown ? 'outcome_unknown' : row.status;
  const [chipLabel, chipClass] = STATUS_CHIP[displayStatus] || [displayStatus, 'bg-slate-100 text-slate-600'];
  const noteValue = note.trim();
  const invalid = noteValue.length < (outcomeUnknown ? 12 : 3);
  const payer = row.payer || {};

  return (
    <Card as="article" data-testid="refund-card" data-status={row.status} className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-slate-900">
            <span className="font-data">{row.transaction_reference}</span>
          </h3>
          <p className="text-xs text-slate-500">
            {payer.is_guest ? 'Guest' : (payer.name || 'Passenger')}{payer.email ? ` · ${payer.email}` : ''} · {CHANNEL[row.payment_channel] || row.payment_channel || 'Online'} · {formatPaidAt(row.paid_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-data text-base font-bold text-slate-900">{formatPeso(row.amount)}</span>
          <span data-testid="refund-status" className={`rounded-full px-2.5 py-1 text-xs font-semibold ${chipClass}`}>{chipLabel}</span>
        </div>
      </div>

      <ul className="space-y-0.5 text-sm text-slate-700">
        {(row.trips || []).map((trip) => <li key={trip.trip_id}>{tripLine(trip)}</li>)}
      </ul>

      {outcomeUnknown ? (
        <>
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" data-testid="checkout-outcome-warning">
            {row.reason} Check the PayMongo dashboard by transaction reference. Do not confirm if a session is active or payment may have succeeded; signed webhooks alone mark payments paid.
          </p>
          <dl className="grid gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
            <div className="min-w-0"><dt className="inline text-slate-500">Transaction reference: </dt><dd className="inline font-data break-all">{row.transaction_reference}</dd></div>
            <div className="min-w-0"><dt className="inline text-slate-500">Checkout session: </dt><dd className="inline font-data break-all">{row.gateway_reference || 'No session ID was returned'}</dd></div>
          </dl>
          <form
            className="space-y-2 border-t border-slate-100 pt-3"
            onSubmit={(event) => { event.preventDefault(); if (!invalid && confirmedNotCharged) onReconcile(row.payment_id, { note: noteValue }); }}
          >
            <label className="block text-xs font-medium text-slate-600">Verification note (required)
              <input type="text" minLength={12} maxLength={255} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What did you verify in PayMongo?" className={`${FIELD} mt-1`} />
            </label>
            <label className="flex items-start gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={confirmedNotCharged} onChange={(event) => setConfirmedNotCharged(event.target.checked)} className="mt-0.5" />
              I verified this checkout was not charged and has no active session.
            </label>
            {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={invalid || !confirmedNotCharged || busy} className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60">
                {busy ? 'Releasing hold...' : 'Confirm not charged and release hold'}
              </button>
            </div>
          </form>
        </>
      ) : waiting ? (
        <>
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800" data-testid="refund-reason">
            {row.reason} The passenger was charged. Refund it in your PayMongo dashboard, then record it here. This screen does not move money.
          </p>
          <dl className="grid gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
            <div className="min-w-0"><dt className="inline text-slate-500">PayMongo payment: </dt><dd className="inline font-data break-all">{row.gateway_payment_id || 'not stored (find it by the checkout reference)'}</dd></div>
            <div className="min-w-0"><dt className="inline text-slate-500">Checkout: </dt><dd className="inline font-data break-all">{row.gateway_reference || 'unavailable'}</dd></div>
          </dl>
          <form
            className="space-y-2 border-t border-slate-100 pt-3"
            onSubmit={(e) => { e.preventDefault(); if (!invalid) onRecord(row.payment_id, { note: noteValue }); }}
          >
            <label className="block text-xs font-medium text-slate-600">PayMongo refund ID or reference (required)
              <input type="text" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. rf_..." className={`${FIELD} mt-1`} />
            </label>
            {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={invalid || busy} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                {busy ? 'Recording...' : 'Record refund'}
              </button>
            </div>
          </form>
        </>
      ) : (
        <p className="border-t border-slate-100 pt-3 text-sm text-slate-700" data-testid="refund-recorded">
          Refund recorded by {row.refunded_by_name || 'an Operator'} on {formatPaidAt(row.refunded_at)}.
          {row.refund_note ? <span className="mt-1 block text-xs text-slate-500">Reference: <span className="font-data">{row.refund_note}</span></span> : null}
        </p>
      )}
    </Card>
  );
}

/**
 * Online payments the system took money for but could not turn into tickets: the payment arrived after its seats were
 * released and could not be honoured. The Operator refunds each in PayMongo and records it here. `embedded` (inside the
 * Finance page) drops the heading, which the Finance tab provides.
 */
export default function PaymentRefundsPage({ service, embedded = false }) {
  const r = usePaymentRefunds(service ? { service } : undefined);
  const counts = r.meta?.counts;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {!embedded && <h2 className="text-xl font-bold text-slate-900">Refunds</h2>}
          <p className="text-xs text-slate-500">Review charged payments for refunds and unknown checkout outcomes. Only signed webhooks confirm payment.</p>
        </div>
        <div className="inline-flex max-w-full flex-wrap rounded-lg border border-slate-200 bg-white p-0.5 text-sm font-semibold" role="group" aria-label="Status">
          {FILTERS.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={r.status === key} onClick={() => r.setStatus(key)} className={`rounded-md px-3 py-1.5 ${r.status === key ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {label}{counts && key !== 'all' ? ` (${formatCount(counts[key])})` : ''}
            </button>
          ))}
        </div>
      </div>

      {r.error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{r.error}</span>
          <button type="button" onClick={r.retry} className="font-semibold underline">Try again</button>
        </div>
      ) : r.loading && !r.hasData ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Loading payments...</p>
      ) : r.rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600" data-testid="refunds-empty">
          {r.status === 'needs_refund' ? 'Nothing needs a refund. A payment appears here only when it was charged after its seats were released.' : r.status === 'outcome_unknown' ? 'No checkout outcomes need reconciliation.' : 'No payments to show.'}
        </p>
      ) : (
        <div className={`space-y-3 ${r.loading ? 'opacity-60' : ''}`}>
          {r.rows.map((row) => (
            <RefundCard key={row.payment_id} row={row} busy={r.busyId === row.payment_id} error={r.errors[row.payment_id]} onRecord={r.recordRefund} onReconcile={r.reconcileNotCharged} />
          ))}
        </div>
      )}

      {r.meta && r.meta.last_page > 1 && (
        <nav aria-label="Refund pages" className="flex items-center justify-between gap-2 text-sm">
          <button type="button" onClick={() => r.setPage(r.meta.page - 1)} disabled={r.meta.page <= 1 || r.loading} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-50"><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous</button>
          <span className="text-xs text-slate-500">Page {formatCount(r.meta.page)} of {formatCount(r.meta.last_page)}</span>
          <button type="button" onClick={() => r.setPage(r.meta.page + 1)} disabled={r.meta.page >= r.meta.last_page || r.loading} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-50">Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
        </nav>
      )}
    </div>
  );
}
