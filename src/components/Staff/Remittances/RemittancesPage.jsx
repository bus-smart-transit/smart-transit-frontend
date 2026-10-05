import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../ui/Card';
import useRemittances from '../../../api/hooks/Staff/useRemittances';
import { formatCount, formatPaidAt, formatPeso } from '../../../utils/financials';

const FIELD = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500';

const FILTERS = [['pending', 'Pending'], ['confirmed', 'Confirmed'], ['all', 'All']];

function Figure({ label, value, strong = false }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`font-data text-sm ${strong ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>{formatPeso(value)}</dd>
    </div>
  );
}

function RemittanceCard({ row, busy, error, onConfirm }) {
  const [counted, setCounted] = useState(row.declared_cash != null ? String(row.declared_cash) : '');
  const [note, setNote] = useState('');
  const pending = row.status === 'pending';
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
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
          {pending ? 'Pending' : row.status === 'flagged' ? 'Flagged' : 'Confirmed'}
        </span>
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
        </div>
      )}
    </Card>
  );
}

/**
 * Batch 29, cash step 3: the Operator's list of remittance batches, one per ended Chauffeur shift. Every figure comes
 * from the server; the Operator only enters the amount they counted.
 */
export default function RemittancesPage({ service }) {
  const r = useRemittances(service ? { service } : undefined);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Remittances</h2>
          <p className="text-xs text-slate-500">The cash handed over after each Chauffeur shift. Count it, then confirm.</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm font-semibold" role="group" aria-label="Status">
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
          {r.status === 'pending' ? 'Nothing is waiting for you. A batch appears here when a Chauffeur ends a shift.' : 'No remittances to show.'}
        </p>
      ) : (
        <div className={`space-y-3 ${r.loading ? 'opacity-60' : ''}`}>
          {r.rows.map((row) => (
            <RemittanceCard key={row.id} row={row} busy={r.busyId === row.id} error={r.errors[row.id]} onConfirm={r.confirm} />
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
