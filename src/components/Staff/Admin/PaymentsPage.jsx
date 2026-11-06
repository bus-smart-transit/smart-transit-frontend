import { OpPageHeader, OpCard, OpStat, OpTable } from '../Operator/OperatorUI';
import { OP_SPACE } from '../Operator/operatorUiTokens';
import Pagination from '../../ui/Pagination';
import { formatPeso, formatCount, monthTotals, presetRange, PRESETS } from '../../../utils/financials';
import { formatManilaDate, formatManilaDateTime } from '../../../utils/dates';

const FIELD = 'min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500';

/**
 * Batch 48 Phase 5: the Super Admin's Payments page, across every company, read only. Fares belong to the bus
 * companies; booking fees are the platform's revenue, so they are shown apart. Payments to refund by hand are listed;
 * the bus company's Operator records each refund.
 */
export default function PaymentsPage({ paymentsTab, today }) {
  const { range, setRange, report, loading, error, refunds, setRefundPage } = paymentsTab;
  const kpis = report?.kpis;
  const fees = kpis?.booking_fees;
  const daily = report?.daily ?? [];
  const months = monthTotals(daily);

  const dayColumns = [
    { key: 'date', header: 'Day', render: (row) => formatManilaDate(row.date) || row.date },
    { key: 'tickets', header: 'Tickets', render: (row) => formatCount(row.tickets) },
    { key: 'net', header: 'Fares kept', render: (row) => formatPeso(row.net) },
    { key: 'fees', header: 'Booking fees kept', render: (row) => formatPeso(row.booking_fees) },
  ];
  const monthColumns = [
    { key: 'month', header: 'Month', render: (row) => row.month },
    { key: 'tickets', header: 'Tickets', render: (row) => formatCount(row.tickets) },
    { key: 'net', header: 'Fares kept', render: (row) => formatPeso(row.net) },
    { key: 'fees', header: 'Booking fees kept', render: (row) => formatPeso(row.booking_fees) },
  ];
  const refundColumns = [
    { key: 'paid', header: 'Paid', className: 'whitespace-nowrap', render: (row) => <span className="font-data text-xs">{formatManilaDateTime(row.paid_at)}</span> },
    { key: 'ref', header: 'Reference', render: (row) => <span className="break-all text-xs">{row.transaction_reference || 'Not provided'}</span> },
    { key: 'amount', header: 'Paid in total', render: (row) => formatPeso(row.total_paid) },
    { key: 'payer', header: 'Paid by', render: (row) => row.payer?.name || row.payer?.email || 'Not provided' },
    { key: 'route', header: 'Route', render: (row) => (row.trips ?? []).map((trip) => trip.route_name).filter(Boolean).join(', ') || 'Not provided' },
  ];

  return (
    <div className={OP_SPACE.stack}>
      <OpPageHeader title="Payments" subtitle="Every company. Fares belong to the bus companies; booking fees are SmartTransit's." />

      <div className="flex flex-wrap items-end gap-2">
        {PRESETS.map((preset) => (
          <button key={preset.key} type="button" onClick={() => setRange(presetRange(preset.key, today))} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50">{preset.label}</button>
        ))}
        <label className="text-xs text-slate-600">From<input type="date" value={range.from} max={range.to} onChange={(event) => event.target.value && setRange({ from: event.target.value })} className={`${FIELD} mt-1 block`} /></label>
        <label className="text-xs text-slate-600">To<input type="date" value={range.to} min={range.from} onChange={(event) => event.target.value && setRange({ to: event.target.value })} className={`${FIELD} mt-1 block`} /></label>
      </div>

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {loading && !report && <p role="status" className="text-sm text-slate-500">Loading...</p>}

      {kpis && (
        <>
          <section aria-label="Fares" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <OpStat label="Tickets paid" value={formatCount(kpis.tickets)} />
            <OpStat label="Fares paid" value={formatPeso(kpis.gross)} />
            <OpStat label="Fares refunded" value={formatPeso(kpis.refunds)} />
            <OpStat label="Fares kept" value={formatPeso(kpis.net)} hint="the bus companies' revenue" />
          </section>
          <section aria-label="Booking fees" className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <OpStat label="Booking fees collected" value={fees ? formatPeso(fees.collected) : 'Not provided'} hint="online bookings only" />
            <OpStat label="Booking fees given back" value={fees ? formatPeso(fees.refunded) : 'Not provided'} />
            <OpStat label="Booking fees kept" value={fees ? formatPeso(fees.net) : 'Not provided'} hint="SmartTransit's revenue" tone="success" />
          </section>

          <OpCard title="By month">
            <OpTable caption="By month" columns={monthColumns} rows={months} rowKey={(row) => row.month} empty="No payments in these dates." />
          </OpCard>
          <OpCard title="By day">
            <OpTable caption="By day" columns={dayColumns} rows={[...daily].reverse()} rowKey={(row) => row.date} empty="No payments in these dates." />
          </OpCard>
        </>
      )}

      <OpCard title="Payments to refund by hand" subtitle="Money was taken but no ticket was made. The bus company's Operator refunds it in PayMongo and records it.">
        <OpTable caption="Payments to refund by hand" columns={refundColumns} rows={refunds.data} rowKey={(row) => row.payment_id} empty="None. Every payment became a ticket or was refunded." />
        {refunds.meta.total > refunds.meta.per_page && (
          <Pagination label="Refund pages" page={refunds.meta.page} perPage={refunds.meta.per_page} total={refunds.meta.total} lastPage={refunds.meta.last_page} onPageChange={setRefundPage} />
        )}
      </OpCard>
    </div>
  );
}
