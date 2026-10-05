import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../ui/Card';
import useRemittances from '../../../api/hooks/Staff/useRemittances';
import { formatCount, formatPaidAt, formatPeso } from '../../../utils/financials';

const FIELD = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500';

const FILTERS = [['pending', 'Pending'], ['flagged', 'Flagged'], ['confirmed', 'Confirmed'], ['resolved', 'Resolved'], ['all', 'All']];

const STATUS_CHIP = {
  pending: ['Pending', 'bg-amber-100 text-amber-800'],
  confirmed: ['Confirmed', 'bg-emerald-100 text-emerald-700'],
  flagged: ['Flagged', 'bg-red-100 text-red-700'],
  resolved: ['Resolved', 'bg-sky-100 text-sky-700'],
};

/** "Short by PHP 10.00" / "Over by PHP 10.00" / "Matched", from the server's variance and its kind. */
function varianceText(variance, kind) {
  if (variance == null) return '';
  if (kind === 'matched' || Number(variance) === 0) return 'Matched the expected cash';
  return `${kind === 'short' ? 'Short' : 'Over'} by ${formatPeso(Math.abs(Number(variance)))}`;
}

function Figure({ label, value, strong = false }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`font-data text-sm ${strong ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>{formatPeso(value)}</dd>
    </div>
  );
}

function RemittanceCard({ row, busy, error, onConfirm, onResolve }) {
  const [counted, setCounted] = useState(row.declared_cash != null ? String(row.declared_cash) : '');
  const [note, setNote] = useState('');
  const [explanation, setExplanation] = useState('');
  const pending = row.status === 'pending';
  const flagged = row.status === 'flagged';
  const resolved = row.status === 'resolved';
  const [chipLabel, chipClass] = STATUS_CHIP[row.status] || [row.status, 'bg-slate-100 text-slate-600'];
  const countedValue = Number(counted);
  const invalid = counted === '' || !Number.isFinite(countedValue) || countedValue < 0;
  const shift = row.shift;
  const autoClosed = shift.end_source && shift.end_source !== 'dashboard';
  const movedSince = !pending && Number(row.expected_now) !== Number(row.expected_cash);

  return (
    <Card as="article" data-testid="remittance-card" data-status={row.status} className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-slate-900">{shift.conductor_name}</h3>
          <p className="text-xs text-slate-500">
            <span className="font-data">{shift.plate_number || 'Bus unavailable'}</span>
            {shift.bus_label ? ` (${shift.bus_label})` : ''} · {shift.route_name || 'Route unavailable'}
          </p>
          <p className="text-xs text-slate-500">
            Shift {formatPaidAt(shift.started_at)} to {formatPaidAt(shift.ended_at)} · {autoClosed ? 'closed automatically' : 'ended by the Chauffeur'}
          </p>
        </div>
        <span data-testid="remittance-status" className={`rounded-full px-2.5 py-1 text-xs font-semibold ${chipClass}`}>{chipLabel}</span>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Figure label="Opening cash" value={row.opening_cash} />
        <Figure label="Cash sales" value={row.cash_sales} />
        <Figure label="Cash refunds" value={row.cash_refunds} />
        <Figure label={pending ? 'Expected cash' : 'Expected when confirmed'} value={row.expected_cash} strong />
      </dl>

      {row.no_declaration ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-testid="no-declaration">
          No count from the Chauffeur: the shift was {autoClosed ? 'closed automatically' : 'ended without one'}. Enter the amount you counted.
        </p>
      ) : (
        <p className="text-sm text-slate-700">The Chauffeur declared <span className="font-data font-semibold">{formatPeso(row.declared_cash)}</span>.</p>
      )}

      {pending && row.variance_now != null && (
        <p className="text-xs text-slate-600" data-testid="variance-now">
          Declared count against expected cash now: {varianceText(row.variance_now, row.variance_now_kind)}. It is checked against the tolerance when you confirm.
        </p>
      )}

      {pending ? (
        <form
          className="space-y-2 border-t border-slate-100 pt-3"
          onSubmit={(e) => { e.preventDefault(); if (!invalid) onConfirm(row.id, { countedAmount: countedValue, note: note.trim() }); }}
        >
          <div className="grid gap-2 sm:grid-cols-[12rem_1fr]">
            <label className="text-xs font-medium text-slate-600">Amount counted (PHP)
              <input type="number" inputMode="decimal" min="0" step="0.01" value={counted} onChange={(e) => setCounted(e.target.value)} aria-invalid={invalid} className={`${FIELD} mt-1`} />
            </label>
            <label className="text-xs font-medium text-slate-600">Note (optional)
              <input type="text" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} className={`${FIELD} mt-1`} />
            </label>
          </div>
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">{row.no_declaration ? 'Required: nothing was declared.' : 'Keep the Chauffeur\'s count to accept it, or type what you counted.'}</p>
            <button type="submit" disabled={invalid || busy} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
              {busy ? 'Confirming...' : 'Confirm remittance'}
            </button>
          </div>
        </form>
      ) : (
        <div className="border-t border-slate-100 pt-3 text-sm text-slate-700">
          <p>
            Confirmed <span className="font-data font-semibold">{formatPeso(row.confirmed_amount)}</span> by {row.confirmed_by_name || 'an Operator'} on {formatPaidAt(row.confirmed_at)}.
          </p>
          {row.note && <p className="mt-1 text-xs text-slate-500">Note: {row.note}</p>}
          {movedSince && <p className="mt-1 text-xs text-amber-700">A refund was paid out after this was confirmed: the expected cash is now {formatPeso(row.expected_now)}.</p>}

          {row.variance != null && !flagged && !resolved && (
            <p className="mt-2 text-xs text-slate-600" data-testid="variance">
              {varianceText(row.variance, row.variance_kind)}
              {row.variance_kind !== 'matched' && Number(row.variance) !== 0 ? ` (within the tolerance of ${formatPeso(row.tolerance_applied)}, approved)` : ''}.
            </p>
          )}

          {(flagged || resolved) && (
            <div className={`mt-2 rounded-lg border px-3 py-2 text-xs ${flagged ? 'border-red-200 bg-red-50 text-red-800' : 'border-sky-200 bg-sky-50 text-sky-800'}`} data-testid="flag-details">
              <p className="font-semibold">
                {flagged ? 'Flagged' : 'Was flagged'}: {varianceText(row.variance, row.variance_kind)} (tolerance {formatPeso(row.tolerance_applied)}).
              </p>
              {flagged && <p className="mt-1">Investigate the difference, then resolve it with an explanation.</p>}
              {resolved && row.resolution && (
                <p className="mt-1" data-testid="resolution">
                  Resolved by {row.resolution.resolved_by_name || 'an Operator'} on {formatPaidAt(row.resolution.resolved_at)}: {row.resolution.note}
                </p>
              )}
            </div>
          )}

          {flagged && (
            <form
              className="mt-3 space-y-2"
              onSubmit={(e) => { e.preventDefault(); if (explanation.trim()) onResolve(row.id, { note: explanation.trim() }); }}
            >
              <label className="block text-xs font-medium text-slate-600">Explanation of the discrepancy (required)
                <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} maxLength={255} rows={2} className={`${FIELD} mt-1`} />
              </label>
              {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
              <div className="flex justify-end">
                <button type="submit" disabled={!explanation.trim() || busy} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
                  {busy ? 'Resolving...' : 'Resolve'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}

/**
 * Batch 29, cash step 3: the Operator's list of remittance batches, one per ended Chauffeur shift. Every figure comes
 * from the server; the Operator only enters the amount they counted. Batch 30: `embedded` (inside the Finance page)
 * drops the heading, which the Finance tab provides.
 */
export default function RemittancesPage({ service, embedded = false }) {
  const r = useRemittances(service ? { service } : undefined);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {!embedded && <h2 className="text-xl font-bold text-slate-900">Remittances</h2>}
          <p className="text-xs text-slate-500">The cash handed over after each Chauffeur shift. Count it, then confirm.</p>
        </div>
        <div className="inline-flex max-w-full flex-wrap rounded-lg border border-slate-200 bg-white p-0.5 text-sm font-semibold" role="group" aria-label="Status">
          {FILTERS.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={r.status === key} onClick={() => r.setStatus(key)} className={`rounded-md px-3 py-1.5 ${r.status === key ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>
          ))}
        </div>
      </div>

      {r.error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{r.error}</span>
          <button type="button" onClick={r.retry} className="font-semibold underline">Try again</button>
        </div>
      ) : r.loading && !r.hasData ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Loading remittances...</p>
      ) : r.rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600" data-testid="remittances-empty">
          {r.status === 'pending' ? 'Nothing is waiting for you. A batch appears here when a Chauffeur ends a shift.' : r.status === 'flagged' ? 'Nothing is flagged.' : 'No remittances to show.'}
        </p>
      ) : (
        <div className={`space-y-3 ${r.loading ? 'opacity-60' : ''}`}>
          {r.rows.map((row) => (
            <RemittanceCard key={row.id} row={row} busy={r.busyId === row.id} error={r.errors[row.id]} onConfirm={r.confirm} onResolve={r.resolve} />
          ))}
        </div>
      )}

      {r.meta && r.meta.last_page > 1 && (
        <nav aria-label="Remittance pages" className="flex items-center justify-between gap-2 text-sm">
          <button type="button" onClick={() => r.setPage(r.meta.page - 1)} disabled={r.meta.page <= 1 || r.loading} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-50"><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous</button>
          <span className="text-xs text-slate-500">Page {formatCount(r.meta.page)} of {formatCount(r.meta.last_page)}</span>
          <button type="button" onClick={() => r.setPage(r.meta.page + 1)} disabled={r.meta.page >= r.meta.last_page || r.loading} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-50">Next <ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
        </nav>
      )}
    </div>
  );
}
