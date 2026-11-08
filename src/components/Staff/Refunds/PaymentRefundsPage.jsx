import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../ui/Card';
import usePaymentRefunds, { STATUS_FILTERS } from '../../../api/hooks/Staff/usePaymentRefunds';
import Modal from '../../ui/Modal';
import { formatCount, formatPaidAt, formatPeso } from '../../../utils/financials';

const FIELD = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500';

// 2026-11-08 (user): the refund of each ticket on a cancelled trip, from PayMongo or in cash.
const TICKET_REFUND_STATUS = {
  pending: ['Refund in progress', 'bg-sky-100 text-sky-700'],
  succeeded: ['Refunded', 'bg-emerald-100 text-emerald-700'],
  failed: ['Refund failed', 'bg-red-100 text-red-700'],
  needs_review: ['Needs review', 'bg-amber-100 text-amber-800'],
};

function TicketRefundCard({ row }) {
  const [label, chip] = TICKET_REFUND_STATUS[row.status] || [row.status, 'bg-slate-100 text-slate-600'];
  const total = Number(row.amount ?? 0) + Number(row.fee_amount ?? 0);
  return (
    <Card as="article" data-testid="ticket-refund-card" data-status={row.status} className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-slate-900">{row.route_name || 'Route unavailable'}{row.trip_date ? `, ${row.trip_date}` : ''}{row.departure_time ? ` ${row.departure_time}` : ''}</h3>
          <p className="text-xs text-slate-500">{row.passenger_name || (row.guest_email ? `Guest · ${row.guest_email}` : 'Passenger')}{row.transaction_reference ? ` · ${row.transaction_reference}` : ''} · {row.method === 'cash' ? 'Cash' : 'PayMongo'}</p>
        </div>
        <span className="flex items-center gap-2">
          <span className="font-data text-base font-bold text-slate-900">{formatPeso(total)}</span>
          <span data-testid="ticket-refund-status" className={`rounded-full px-2.5 py-1 text-xs font-semibold ${chip}`}>{label}</span>
        </span>
      </div>
      <p className="text-xs text-slate-500">
        Requested {row.requested_at ? formatPaidAt(row.requested_at) : 'Not provided'}
        {row.completed_at ? ` · Done ${formatPaidAt(row.completed_at)}` : ''}
        {row.failure_reason ? ` · ${row.failure_reason}` : ''}
      </p>
    </Card>
  );
}

const STATUS_CHIP = {
  needs_refund: ['Needs refund', 'bg-red-100 text-red-700'],
  refund_in_progress: ['Refund in progress', 'bg-sky-100 text-sky-700'],
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
  // Batch 49 item 1: a "bus filled up" payment is refunded through PayMongo automatically; nothing to do while it runs.
  const automatic = waiting && row.automatic_refund_pending === true;
  const displayStatus = outcomeUnknown ? 'outcome_unknown' : automatic ? 'refund_in_progress' : row.status;
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
          <span className="text-right">
            <span className="block font-data text-base font-bold text-slate-900">{formatPeso(row.total_paid ?? row.amount)}</span>
            {Number(row.fee_amount) > 0 && (
              <span className="block text-xs text-slate-500" data-testid="refund-fee-split">
                Fares {formatPeso(row.amount)} + booking fee {formatPeso(row.fee_amount)}
              </span>
            )}
          </span>
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
      ) : automatic ? (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900" data-testid="refund-automatic">
          {row.reason} The full amount was sent back through PayMongo automatically. Nothing to do here: this changes to Refunded when PayMongo confirms it.
        </p>
      ) : waiting ? (
        <>
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800" data-testid="refund-reason">
            {row.reason} The passenger was charged. Refund it in your PayMongo dashboard, then record it here. This screen does not move money.
            {row.refund_note ? <span className="mt-1 block font-semibold">{row.refund_note}</span> : null}
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
          {row.refunded_automatically
            ? <>Refunded automatically through PayMongo on {formatPaidAt(row.refunded_at)}.</>
            : <>Refund recorded by {row.refunded_by_name || 'an Operator'} on {formatPaidAt(row.refunded_at)}.</>}
          {row.refund_note ? <span className="mt-1 block text-xs text-slate-500">Reference: <span className="font-data">{row.refund_note}</span></span> : null}
        </p>
      )}
    </Card>
  );
}

// 2026-11-08 (user): the Refunds tab is one table. One plain status per row; the server decides it (RefundListService).
const ROW_STATUS = {
  needs_refund: ['Needs refund', 'bg-red-100 text-red-700'],
  check_paymongo: ['Check PayMongo', 'bg-amber-100 text-amber-800'],
  in_progress: ['Refund in progress', 'bg-sky-100 text-sky-700'],
  refunded: ['Refunded', 'bg-emerald-100 text-emerald-700'],
  failed: ['Refund failed', 'bg-red-100 text-red-700'],
  needs_review: ['Needs review', 'bg-amber-100 text-amber-800'],
};

const ROW_ACTION = { needs_refund: 'Record refund', check_paymongo: 'Check' };

/**
 * The Refunds tab (2026-11-08, user: one table instead of filter buttons). Every refund of this company in one list,
 * newest first: payments that were charged but made no ticket (or whose checkout is unclear) and the tickets of
 * cancelled trips. A row's button opens its details, and the form to record a refund or confirm an unclear checkout
 * when someone has to act. `embedded` (inside the Finance page) drops the heading, which the Finance tab provides.
 */
export default function PaymentRefundsPage({ service, embedded = false }) {
  const r = usePaymentRefunds(service ? { service } : undefined);
  const counts = r.meta?.counts;
  const [openKey, setOpenKey] = useState(null);
  const open = r.rows.find((row) => row.key === openKey) ?? null;

  const record = async (paymentId, body) => { if (await r.recordRefund(paymentId, body)) setOpenKey(null); };
  const reconcile = async (paymentId, body) => { if (await r.reconcileNotCharged(paymentId, body)) setOpenKey(null); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {!embedded && <h2 className="text-xl font-bold text-slate-900">Refunds</h2>}
          <p className="text-xs text-slate-500">Every refund in one list: payments that made no ticket, unclear checkouts and tickets of cancelled trips. Only signed PayMongo messages confirm a payment or a refund.</p>
        </div>
        <label className="text-xs font-semibold text-slate-600">
          Status
          <select aria-label="Status" value={r.status} onChange={(event) => r.setStatus(event.target.value)} className="mt-1 block min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
            {STATUS_FILTERS.map(([key, label]) => (
              <option key={key} value={key}>{label}{counts ? ` (${formatCount(counts[key])})` : ''}</option>
            ))}
          </select>
        </label>
      </div>

      {r.error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{r.error}</span>
          <button type="button" onClick={r.retry} className="font-semibold underline">Try again</button>
        </div>
      ) : r.loading && !r.hasData ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Loading refunds...</p>
      ) : r.rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600" data-testid="refunds-empty">
          {r.status === 'needs_action' ? 'Nothing needs you right now.' : r.status === 'all' ? 'No refunds yet. A refund appears here when a payment made no ticket or a trip is cancelled.' : 'No refunds with this status.'}
        </p>
      ) : (
        <div className={`overflow-x-auto rounded-xl border border-slate-200 bg-white ${r.loading ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[52rem] text-left text-sm" data-testid="refunds-table">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {['Date', 'Reference', 'Passenger', 'Trip', 'Reason', 'Amount', 'Status', ''].map((heading) => <th key={heading} className="px-3 py-2 font-semibold">{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {r.rows.map((row) => {
                const [label, chip] = ROW_STATUS[row.status] || [row.status, 'bg-slate-100 text-slate-600'];
                return (
                  <tr key={row.key} className="border-t border-slate-100" data-testid="refund-row" data-status={row.status}>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.date ? formatPaidAt(row.date) : 'Not provided'}</td>
                    <td className="px-3 py-2 font-data text-xs text-slate-700">{row.transaction_reference || 'Not provided'}</td>
                    <td className="px-3 py-2 text-slate-700">{row.passenger}{row.email ? <span className="block text-xs text-slate-500">{row.email}</span> : null}</td>
                    <td className="px-3 py-2 text-slate-700">{row.trip || 'Not provided'}</td>
                    <td className="px-3 py-2 text-slate-700">{row.reason}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-data font-semibold text-slate-900">{formatPeso(row.amount)}</td>
                    <td className="px-3 py-2"><span data-testid="refund-row-status" className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${chip}`}>{label}</span></td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setOpenKey(row.key)}
                        className={`min-h-11 whitespace-nowrap rounded-lg px-3 text-xs font-semibold ${row.needs_action ? 'bg-teal-600 text-white hover:bg-teal-700' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                      >
                        {ROW_ACTION[row.status] || (row.needs_action ? 'Review' : 'Details')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {r.meta && r.meta.last_page > 1 && (
        <nav aria-label="Refund pages" className="flex items-center justify-between gap-2 text-sm">
          <button type="button" onClick={() => r.setPage(r.meta.page - 1)} disabled={r.meta.page <= 1 || r.loading} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-50"><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous</button>
          <span className="text-xs text-slate-500">Page {formatCount(r.meta.page)} of {formatCount(r.meta.last_page)}</span>
          <button type="button" onClick={() => r.setPage(r.meta.page + 1)} disabled={r.meta.page >= r.meta.last_page || r.loading} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-50">Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
        </nav>
      )}

      <Modal open={Boolean(open)} onClose={() => setOpenKey(null)} title={open ? `${open.reason} · ${open.transaction_reference || 'No reference'}` : 'Refund'} size="lg">
        {open?.kind === 'payment' && (
          <RefundCard row={open.detail} busy={r.busyId === open.detail.payment_id} error={r.errors[open.detail.payment_id]} onRecord={record} onReconcile={reconcile} />
        )}
        {open?.kind === 'ticket' && (
          <div className="space-y-3">
            <TicketRefundCard row={open.detail} />
            {open.needs_action && <p className="text-xs text-slate-600">Handle it on the Schedule page, in the list of tickets of cancelled trips.</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
