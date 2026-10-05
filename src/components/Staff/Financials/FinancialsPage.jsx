import { Download, Loader2, RotateCcw } from 'lucide-react';
import Card from '../../ui/Card';
import useFinancials from '../../../api/hooks/Staff/useFinancials';
import { PRESETS, formatCount, formatPercent, formatPeso, paymentFilterPatch, paymentFilterValue } from '../../../utils/financials';
import { BarList, HourChart, SplitBar } from './FinancialCharts';
import TransactionsTable from './TransactionsTable';

const FIELD = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500';

function Kpi({ label, value, hint, tone = 'text-slate-900', testId }) {
  return (
    <Card padding="sm" className="min-w-0" data-testid={testId}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 truncate font-data text-xl font-bold sm:text-2xl ${tone}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

function Section({ title, hint, children }) {
  return (
    <Card as="section" aria-label={title} className="min-w-0 space-y-3">
      <div>
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      {children}
    </Card>
  );
}

/**
 * Batch 29, Stage 2: the Operator's financial page. Replaces the raw report table: paid tickets only, refunds as their
 * own figure, Manila days and hours, every number from the server's stored amounts. No fare is computed here.
 */
export default function FinancialsPage({ service }) {
  const f = useFinancials(service ? { service } : undefined);
  const { filters, summary, summaryError, summaryLoading } = f;
  const options = summary?.options ?? { routes: [], fleets: [], trips: [], channels: [] };
  const kpis = summary?.kpis;

  const onlineChannels = options.channels.filter((c) => c.method === 'online');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Financials</h2>
          <p className="text-xs text-slate-500">Paid tickets only. Dates and hours are Manila time.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[['transactions', 'Export transactions (CSV)'], ['daily', 'Export daily summary (CSV)']].map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() => f.exportCsv(type)}
              disabled={Boolean(f.exporting)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {f.exporting === type ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
              {label}
            </button>
          ))}
        </div>
      </div>
      {f.exportError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{f.exportError}</p>}

      <Card as="section" aria-label="Filters" className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick date ranges">
          {PRESETS.map((preset) => (
            <button key={preset.key} type="button" onClick={() => f.applyPreset(preset.key)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              {preset.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <label className="text-xs font-medium text-slate-600">From
            <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => e.target.value && f.updateFilters({ from: e.target.value })} className={`${FIELD} mt-1`} />
          </label>
          <label className="text-xs font-medium text-slate-600">To
            <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => e.target.value && f.updateFilters({ to: e.target.value })} className={`${FIELD} mt-1`} />
          </label>
          <label className="text-xs font-medium text-slate-600">Route
            <select value={filters.route_id} onChange={(e) => f.updateFilters({ route_id: e.target.value })} className={`${FIELD} mt-1`}>
              <option value="">All routes</option>
              {options.routes.map((r) => <option key={r.route_id} value={r.route_id}>{r.route_name}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">Bus
            <select value={filters.fleet_id} onChange={(e) => f.updateFilters({ fleet_id: e.target.value })} className={`${FIELD} mt-1`}>
              <option value="">All buses</option>
              {options.fleets.map((b) => <option key={b.fleet_id} value={b.fleet_id}>{b.plate_number}{b.bus_label ? ` (${b.bus_label})` : ''}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">Payment
            <select value={paymentFilterValue(filters)} onChange={(e) => f.updateFilters(paymentFilterPatch(e.target.value))} className={`${FIELD} mt-1`}>
              <option value="">All payments</option>
              <option value="method:cash">Cash</option>
              <option value="method:online">Online (all)</option>
              {onlineChannels.map((c) => <option key={c.channel} value={`channel:${c.channel}`}>{c.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">Trip
            <select value={filters.trip_id} onChange={(e) => f.updateFilters({ trip_id: e.target.value })} className={`${FIELD} mt-1`}>
              <option value="">All trips</option>
              {options.trips.map((t) => <option key={t.trip_id} value={t.trip_id}>{t.label}</option>)}
            </select>
          </label>
        </div>
        <button type="button" onClick={f.resetFilters} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900">
          <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reset filters
        </button>
      </Card>

      {summaryError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{summaryError}</span>
          <button type="button" onClick={f.retry} className="font-semibold underline">Try again</button>
        </div>
      ) : summaryLoading && !summary ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Loading the figures...</p>
      ) : kpis && (
        <div className={`space-y-4 ${summaryLoading ? 'opacity-60' : ''}`}>
          {kpis.tickets === 0 && kpis.refunds === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600" data-testid="financial-empty">
              No paid tickets in this range. Pending, failed and expired payments are never counted.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="kpis">
            <Kpi label="Gross revenue" value={formatPeso(kpis.gross)} hint="Paid tickets" testId="kpi-gross" />
            <Kpi label="Refunds" value={formatPeso(kpis.refunds)} hint="Completed in this range" tone="text-rose-600" testId="kpi-refunds" />
            <Kpi label="Net revenue" value={formatPeso(kpis.net)} hint="Gross minus refunds" tone="text-teal-700" testId="kpi-net" />
            <Kpi label="Paid tickets" value={formatCount(kpis.tickets)} hint={`${formatCount(kpis.boarded)} boarded`} testId="kpi-tickets" />
            <Kpi label="Average fare" value={formatPeso(kpis.average_fare)} hint="Gross per paid ticket" testId="kpi-average" />
            <Card padding="sm" className="col-span-2 min-w-0" data-testid="kpi-split">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Cash vs online</p>
              <SplitBar cash={kpis.cash} online={kpis.online} />
            </Card>
          </div>
          <p className="text-xs text-slate-500">
            Refunds are counted on the day they were completed, so they can include tickets sold before this range. Boarded means the ticket was scanned on board.
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Payment channels" hint="Only methods that have sales in this range.">
              <BarList
                rows={summary.channels.map((c) => ({ key: `${c.method}-${c.channel}`, label: c.label, value: c.gross, sublabel: `${formatCount(c.tickets)} tickets · ${formatPercent(c.percent)}`, detail: c.refunds > 0 ? `Refunds ${formatPeso(c.refunds)} · Net ${formatPeso(c.net)}` : '' }))}
              />
            </Section>
            <Section title="Revenue by hour" hint="Gross by the Manila hour of the sale.">
              <HourChart hours={summary.by_hour} />
            </Section>
            <Section title="By route">
              <BarList
                rows={summary.by_route.map((r) => ({ key: r.route_id, label: r.route_name, value: r.gross, sublabel: `${formatCount(r.tickets)} tickets`, detail: r.refunds > 0 ? `Net ${formatPeso(r.net)}` : '' }))}
              />
            </Section>
            <Section title="By bus" hint="Plate number, with the bus label when one is set.">
              <BarList
                rows={summary.by_bus.map((b) => ({ key: b.fleet_id, label: b.plate_number, value: b.gross, sublabel: b.bus_label || 'Bus label unavailable', detail: `${formatCount(b.tickets)} tickets${b.refunds > 0 ? ` · Net ${formatPeso(b.net)}` : ''}` }))}
              />
            </Section>
          </div>

          <Section title="By trip" hint="Each departure with its shift block, if any.">
            <BarList
              rows={summary.by_trip.map((t) => ({
                key: t.trip_id,
                label: `${t.trip_date} ${t.departure_time || ''} · ${t.route_name}`.trim(),
                value: t.gross,
                sublabel: `${t.plate_number}${t.shift_block_id ? ` · Block #${t.shift_block_id}` : ''}`,
                detail: `${formatCount(t.tickets)} tickets${t.refunds > 0 ? ` · Net ${formatPeso(t.net)}` : ''}`,
              }))}
            />
          </Section>
        </div>
      )}

      <TransactionsTable
        log={f.log}
        loading={f.logLoading}
        error={f.logError}
        table={f.table}
        onSort={f.sortBy}
        onPage={f.goToPage}
        onRetry={f.retry}
      />
    </div>
  );
}
