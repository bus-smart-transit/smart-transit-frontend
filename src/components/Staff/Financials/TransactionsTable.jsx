import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../ui/Card';
import { STATUS_STYLE, formatCount, formatPaidAt, formatPeso } from '../../../utils/financials';

const COLUMNS = [
  { key: 'paid_at', label: 'Time', sort: 'paid_at' },
  { key: 'transaction_id', label: 'Transaction' },
  { key: 'bus', label: 'Bus', sort: 'bus' },
  { key: 'route', label: 'Route', sort: 'route' },
  { key: 'direction', label: 'Direction' },
  { key: 'method', label: 'Payment', sort: 'method' },
  { key: 'service', label: 'Service' },
  { key: 'seat', label: 'Ticket type' },
  { key: 'discount', label: 'Discount' },
  { key: 'amount', label: 'Fare paid', sort: 'amount', align: 'right' },
  { key: 'status', label: 'Status', sort: 'status' },
];

const SERVICE_LABEL = { regular: 'Regular', express: 'Express' };

/** The paginated, sortable transaction log. Every value is read from the server's row. */
export default function TransactionsTable({ log, loading, error, table, onSort, onPage, onRetry }) {
  const rows = log?.data ?? [];
  const meta = log?.meta;

  return (
    <Card as="section" aria-label="Transactions" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-bold text-slate-900">Transactions</h3>
        {meta && <p className="text-xs text-slate-500">{formatCount(meta.total)} {meta.total === 1 ? 'ticket' : 'tickets'}</p>}
      </div>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={onRetry} className="font-semibold underline">Try again</button>
        </div>
      ) : loading && !log ? (
        <p className="text-sm text-slate-500">Loading transactions...</p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No paid tickets match these filters.</p>
      ) : (
        <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[64rem] text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                {COLUMNS.map((col) => {
                  const active = table.sort === col.sort;
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={active ? (table.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {col.sort ? (
                        <button type="button" onClick={() => onSort(col.sort)} className="inline-flex items-center gap-1 uppercase hover:text-slate-800">
                          {col.label}
                          {active && (table.dir === 'asc' ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />)}
                        </button>
                      ) : col.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.ticket_id} className="border-b border-slate-100 hover:bg-slate-50" data-testid="transaction-row">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">{formatPaidAt(row.paid_at)}</td>
                  <td className="px-3 py-2 font-data text-xs text-slate-600">{row.transaction_id}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                    <span className="font-data">{row.plate_number}</span>
                    {row.bus_label && <span className="block text-xs text-slate-500">{row.bus_label}</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.route_name}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{row.direction_label}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">{row.method === 'cash' ? 'Cash' : row.channel_label}</td>
                  <td className="px-3 py-2 text-slate-700">{SERVICE_LABEL[row.service_type] || row.service_type || '-'}</td>
                  <td className="px-3 py-2 text-slate-700 capitalize">{row.seat_type || '-'}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {row.discount_label
                      ? <><span className="block">{row.discount_label}</span><span className="text-xs text-slate-500">-{formatPeso(row.discount_amount)} ({Math.round(Number(row.discount_rate) * 100)}%)</span></>
                      : '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-data font-semibold text-slate-900">
                    {formatPeso(row.amount)}
                    {row.discount_amount > 0 && <span className="block text-xs font-normal text-slate-500">Regular {formatPeso(row.original_amount)}</span>}
                    {row.refunded > 0 && <span className="block text-xs font-normal text-rose-600">- {formatPeso(row.refunded)}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[row.status] || 'bg-slate-100 text-slate-600'}`}>{row.status_label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <nav aria-label="Transactions pages" className="flex items-center justify-between gap-2 text-sm">
          <button type="button" onClick={() => onPage(meta.page - 1)} disabled={meta.page <= 1 || loading} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-50">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
          </button>
          <span className="text-xs text-slate-500">Page {meta.page} of {meta.last_page}</span>
          <button type="button" onClick={() => onPage(meta.page + 1)} disabled={meta.page >= meta.last_page || loading} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:opacity-50">
            Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </Card>
  );
}
