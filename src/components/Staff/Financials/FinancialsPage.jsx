import { useState } from 'react';
import {
  Download, Loader2, RotateCcw, Wallet, Undo2, Banknote, Ticket, Calculator, Percent, Receipt, ArrowLeftRight,
  Filter, TrendingUp, CreditCard, MapPin, ScrollText, Lightbulb, ArrowRight,
} from 'lucide-react';
import Card from '../../ui/Card';
import FileTypeSelect from '../../ui/FileTypeSelect';
import { DEFAULT_FILE_TYPE } from '../../../utils/tableExport';
import useFinancials from '../../../api/hooks/Staff/useFinancials';
import {
  PRESETS, dailySeries, formatCount, formatPaidAt, formatPeso, previousLabel, topRoutes,
} from '../../../utils/financials';
import { ChannelRing, TrendChart } from './FinancialCharts';
import TransactionsTable from './TransactionsTable';
import { OpDelta } from '../Operator/OperatorUI';

import { SkeletonStats } from '../../ui/Skeleton';
const FIELD = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500';
const ICON_TILE = 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700';
// Batch 81: the headline cards show their icon from tablet width up, so on a phone the amount has the whole card.
const KPI_ICON = 'hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 sm:inline-flex';

function Kpi({ label, value, delta = null, hint = null, tone = 'text-slate-900', testId, icon: Icon = null, children = null }) {
  return (
    <Card padding="sm" className="min-w-0 p-4! sm:p-5!" data-testid={testId}>
      <div className="flex items-start gap-3">
        {Icon && <span className={KPI_ICON} aria-hidden="true"><Icon className="h-5 w-5" /></span>}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-slate-500">{label}</p>
          <p className={`mt-1 whitespace-nowrap font-display text-lg font-bold leading-tight tracking-tight tabular-nums sm:text-[1.625rem] ${tone}`}>{value}</p>
          {delta && <div className="mt-1.5">{delta}</div>}
          {hint && <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{hint}</p>}
          {children}
        </div>
      </div>
    </Card>
  );
}

function Section({ title, hint, icon: Icon = null, action = null, children, className = '' }) {
  return (
    <Card as="section" aria-label={title} className={`min-w-0 space-y-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && <span className={ICON_TILE} aria-hidden="true"><Icon className="h-5 w-5" /></span>}
          <div className="min-w-0">
            <h3 className="font-display text-[1.0625rem] font-semibold text-slate-900">{title}</h3>
            {hint && <p className="mt-0.5 text-[13px] text-slate-500">{hint}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function Insight({ icon: Icon, label, value, hint }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
      <span className={ICON_TILE} aria-hidden="true"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-display text-lg font-bold tabular-nums text-slate-900">{value}</p>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

/**
 * Batch 29, Stage 2: the Operator's financial page: paid tickets only, refunds as their own figure, Manila days and
 * hours, every number from the server's stored amounts. No fare is computed here.
 * Batch 30: inside Finance the same page serves two tabs. `view="overview"` shows the figures and charts,
 * `view="transactions"` the transaction log, both under the same filters (so switching keeps them).
 * Batch 81 (user, 2026-11-19, the designer's mock-up): four headline figures with the change against the period of the
 * same length just before; the filters with the exports; the revenue trend (per day, or per hour for one day); payment
 * channels; top routes; recent transactions; quick insights. By bus, By trip and Discounts by type left the overview
 * (the Bus and Trip filters and the Transactions tab cover the first two; discounts have their own tab).
 */
export default function FinancialsPage({ service, view = 'all', embedded = false, onOpenTransactions = null }) {
  const f = useFinancials(service ? { service } : undefined);
  const [fileType, setFileType] = useState(DEFAULT_FILE_TYPE);
  const { filters, summary, summaryError, summaryLoading, previousKpis, previousDays } = f;
  const kpis = summary?.kpis;
  const showOverview = view !== 'transactions';
  const showTransactions = view !== 'overview';
  const vs = previousLabel(previousDays);
  const singleDay = filters.from === filters.to;
  const trend = singleDay
    ? (summary?.by_hour ?? []).map((h) => ({ label: h.label, value: h.gross }))
    : dailySeries(summary?.daily ?? [], filters.from, filters.to);
  const routes = topRoutes(summary?.by_route ?? []);
  const topGross = Math.max(...routes.map((r) => Number(r.gross) || 0), 1);
  const recent = (f.log?.data ?? []).slice(0, 5);

  return (
    <div className="space-y-4">
      {!embedded && <h2 className="font-display text-xl font-bold text-slate-900">Financials</h2>}
      {f.exportError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{f.exportError}</p>}

      {showOverview && kpis && (
        <div className={`grid grid-cols-2 gap-3 xl:grid-cols-4 ${summaryLoading ? 'opacity-60' : ''}`} data-testid="kpis">
          <Kpi icon={Wallet} label="Gross revenue" value={formatPeso(kpis.gross)} delta={previousKpis && <OpDelta current={kpis.gross} previous={previousKpis.gross} label={vs} />} hint="Paid tickets" testId="kpi-gross" />
          <Kpi icon={Banknote} label="Net revenue" value={formatPeso(kpis.net)} delta={previousKpis && <OpDelta current={kpis.net} previous={previousKpis.net} label={vs} />} hint="Gross minus refunds" tone="text-teal-700" testId="kpi-net" />
          <Kpi icon={Undo2} label="Refunds" value={formatPeso(kpis.refunds)} delta={previousKpis && <OpDelta current={kpis.refunds} previous={previousKpis.refunds} label={vs} upIsGood={false} />} tone="text-rose-600" testId="kpi-refunds">
            <label className="mt-1.5 block text-xs text-slate-500">
              <span className="sr-only">Refunds counted by</span>
              <select value={filters.refund_basis} onChange={(e) => f.updateFilters({ refund_basis: e.target.value })} className="w-full rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700" aria-label="Refunds counted by">
                <option value="completed">By day completed</option>
                <option value="sale">By day of the sale</option>
              </select>
            </label>
          </Kpi>
          <Kpi icon={Ticket} label="Tickets sold" value={formatCount(kpis.tickets)} delta={previousKpis && <OpDelta current={kpis.tickets} previous={previousKpis.tickets} label={vs} />} hint={`${formatCount(kpis.boarded)} boarded`} testId="kpi-tickets" />
        </div>
      )}

      <Card as="section" aria-label="Filters" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className={ICON_TILE} aria-hidden="true"><Filter className="h-5 w-5" /></span>
            <div>
              <h3 className="font-display text-[1.0625rem] font-semibold text-slate-900">Filter transactions</h3>
              <p className="mt-0.5 text-[13px] text-slate-500">Paid tickets only.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FileTypeSelect id="financials-file-type" value={fileType} onChange={setFileType} />
            {[['transactions', 'Export transactions'], ['refunds', 'Export refunds'], ['daily', 'Daily summary']].map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => f.exportReport(type, fileType)}
                disabled={Boolean(f.exporting)}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {f.exporting === type ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick date ranges">
          {PRESETS.map((preset) => (
            <button key={preset.key} type="button" onClick={() => f.applyPreset(preset.key)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              {preset.label}
            </button>
          ))}
        </div>
        {/* 2026-11-24 (user): the transactions are filtered by date only (From and To); route, bus, payment and trip are gone. */}
        <div className="grid max-w-md grid-cols-2 gap-3">
          <label className="text-xs font-medium text-slate-600">From
            <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => e.target.value && f.updateFilters({ from: e.target.value })} className={`${FIELD} mt-1`} />
          </label>
          <label className="text-xs font-medium text-slate-600">To
            <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => e.target.value && f.updateFilters({ to: e.target.value })} className={`${FIELD} mt-1`} />
          </label>
        </div>
        <button type="button" onClick={f.resetFilters} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900">
          <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reset filters
        </button>
      </Card>

      {!showOverview ? null : summaryError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{summaryError}</span>
          <button type="button" onClick={f.retry} className="font-semibold underline">Try again</button>
        </div>
      ) : summaryLoading && !summary ? (
        <SkeletonStats label="Loading the figures..." count={8} />
      ) : kpis && (
        <div className={`space-y-4 ${summaryLoading ? 'opacity-60' : ''}`}>
          {kpis.tickets === 0 && kpis.refunds === 0 && (
            <p className="rounded-xl bg-white px-4 py-3.5 text-sm text-slate-600 ring-1 ring-slate-200" data-testid="financial-empty">
              No paid tickets in this range. Pending, failed and expired payments are never counted.
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Section icon={TrendingUp} title="Revenue trend" hint={singleDay ? 'Gross by the hour of the sale.' : 'Gross revenue per day.'}>
              <TrendChart points={trend} label={singleDay ? 'Gross revenue by hour' : 'Gross revenue per day'} />
            </Section>
            <Section icon={CreditCard} title="Payment channels" hint="Revenue by payment method.">
              <ChannelRing channels={summary.channels} total={kpis.gross} />
            </Section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section icon={MapPin} title="Top routes by revenue" hint="Routes with the highest earnings in this range.">
              {routes.length === 0 ? <p className="text-sm text-slate-500">No sales in this range.</p> : (
                <ol className="space-y-3" data-testid="top-routes">
                  {routes.map((r, i) => (
                    <li key={r.route_id} className="flex items-center gap-3">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900">{r.route_name}</span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{formatPeso(r.gross)}</span>
                        </div>
                        <div className="mt-1.5 h-2 rounded-full bg-slate-100" aria-hidden="true">
                          <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.max(2, Math.round((Number(r.gross) / topGross) * 100))}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{formatCount(r.tickets)} tickets{Number(r.refunds) > 0 ? ` · Net ${formatPeso(r.net)}` : ''}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
            <Section
              icon={ScrollText}
              title="Recent transactions"
              hint="The latest ticket sales in this range."
              action={onOpenTransactions && (
                <button type="button" onClick={onOpenTransactions} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                  View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            >
              {f.logLoading && !f.log ? <p className="text-sm text-slate-500">Loading...</p> : recent.length === 0 ? <p className="text-sm text-slate-500">No transactions in this range.</p> : (
                <ul className="divide-y divide-slate-100" data-testid="recent-transactions">
                  {recent.map((row) => {
                    const refunded = Number(row.refunded) > 0;
                    return (
                      <li key={row.ticket_id} className="flex items-center gap-3 py-2.5">
                        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${refunded ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`} aria-hidden="true">
                          {refunded ? <Undo2 className="h-4 w-4" /> : <Ticket className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">{refunded ? 'Refunded sale' : 'Ticket sale'} <span className="font-normal text-slate-500">· {row.channel_label || row.method}</span></p>
                          <p className="truncate text-xs text-slate-500">{row.route_name || 'Route not provided'}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`text-sm font-semibold tabular-nums ${refunded ? 'text-rose-600' : 'text-emerald-700'}`}>{refunded ? `-${formatPeso(row.refunded)}` : `+${formatPeso(row.amount)}`}</p>
                          <p className="text-xs text-slate-500">{formatPaidAt(row.paid_at)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>
          </div>

          <Section icon={Lightbulb} title="Quick insights" hint="Key figures for the selected period.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="quick-insights">
              <Insight icon={Calculator} label="Average fare" value={formatPeso(kpis.average_fare)} hint="Gross per paid ticket" />
              <Insight icon={Percent} label="Discounts given" value={formatPeso(summary.discounts?.total ?? 0)} hint={`${formatCount(summary.discounts?.tickets ?? 0)} discounted tickets`} />
              <Insight icon={Receipt} label="Transaction fees" value={kpis.booking_fees ? formatPeso(kpis.booking_fees.net) : 'Not provided'} hint="Online fee, not part of the fares" />
              <Insight icon={ArrowLeftRight} label="Cash vs online" value={`${Math.round(Number(kpis.cash?.percent) || 0)}% / ${Math.round(Number(kpis.online?.percent) || 0)}%`} hint={`${formatPeso(kpis.cash?.gross)} cash · ${formatPeso(kpis.online?.gross)} online`} />
            </div>
          </Section>
          <p className="text-xs text-slate-500">
            {filters.refund_basis === 'sale'
              ? 'Refunds are matched back to the day of the original sale, so each day shows what its sales really earned. Do not use this view to reconcile a cash drawer.'
              : 'Refunds are counted on the day they were completed, when the money actually moved, so a closed day is never changed.'}
            {' '}Boarded means the ticket was scanned on board.
          </p>
        </div>
      )}

      {showTransactions && (
        <TransactionsTable
          log={f.log}
          loading={f.logLoading}
          error={f.logError}
          table={f.table}
          onSort={f.sortBy}
          onPage={f.goToPage}
          onRetry={f.retry}
        />
      )}
    </div>
  );
}
