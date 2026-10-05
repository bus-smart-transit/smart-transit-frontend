import { formatCount, formatPeso, formatPercent } from '../../../utils/financials';

/**
 * Batch 29, Stage 2: the two simple charts of the financial page, drawn with plain elements (no chart library; the
 * project has none). Bars are scaled to the largest value on screen; every amount is the server's figure.
 */

/** A list of labelled horizontal bars. rows: [{ key, label, sublabel?, value, detail? }] */
export function BarList({ rows, valueKey = 'value', emptyMessage = 'Nothing to show for this range.' }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }
  const max = Math.max(...rows.map((row) => Math.abs(Number(row[valueKey] || 0))), 0);

  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const value = Number(row[valueKey] || 0);
        const width = max > 0 ? Math.max(2, Math.round((Math.abs(value) / max) * 100)) : 0;
        return (
          <li key={row.key} data-testid="bar-row">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-semibold text-slate-800">{row.label}</p>
              <p className="shrink-0 font-data text-sm font-semibold text-slate-900">{formatPeso(value)}</p>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <div className="h-full rounded-full bg-teal-500" style={{ width: `${width}%` }} />
            </div>
            {(row.sublabel || row.detail) && (
              <p className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs text-slate-500">
                <span>{row.sublabel}</span>
                <span>{row.detail}</span>
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Revenue by hour of the Manila day: 24 columns, labelled every third hour. hours: [{ hour, label, tickets, gross }] */
export function HourChart({ hours }) {
  const list = Array.isArray(hours) ? hours : [];
  const max = Math.max(...list.map((h) => Number(h.gross || 0)), 0);

  if (max <= 0) {
    return <p className="text-sm text-slate-500">No sales in this range, so there is no hourly pattern yet.</p>;
  }

  const busiest = list.reduce((best, h) => (Number(h.gross) > Number(best.gross) ? h : best), list[0]);

  return (
    <div>
      <div
        role="img"
        aria-label={`Revenue by hour of the day. Busiest hour ${busiest.label} with ${formatPeso(busiest.gross)} from ${formatCount(busiest.tickets)} tickets.`}
        className="flex h-40 items-end gap-0.5"
      >
        {list.map((h) => {
          const height = Math.round((Number(h.gross || 0) / max) * 100);
          return (
            <div key={h.hour} className="flex h-full flex-1 flex-col justify-end" title={`${h.label}: ${formatPeso(h.gross)} (${formatCount(h.tickets)} tickets)`} data-testid="hour-bar">
              <div className={`w-full rounded-t ${Number(h.gross) > 0 ? 'bg-teal-500' : 'bg-slate-100'}`} style={{ height: `${Number(h.gross) > 0 ? Math.max(4, height) : 2}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-0.5 text-[10px] text-slate-500" aria-hidden="true">
        {list.map((h) => (
          <span key={h.hour} className="flex-1 text-center">{h.hour % 3 === 0 ? String(h.hour).padStart(2, '0') : ''}</span>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">Busiest hour: {busiest.label} ({formatPeso(busiest.gross)}, {formatCount(busiest.tickets)} tickets). Hours are Manila time.</p>
    </div>
  );
}

/** One cash-vs-online split bar with its two figures. */
export function SplitBar({ cash, online }) {
  const cashPct = Number(cash?.percent || 0);
  const onlinePct = Number(online?.percent || 0);
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Cash ${formatPercent(cashPct)}, online ${formatPercent(onlinePct)}`}>
        <div className="h-full bg-amber-400" style={{ width: `${cashPct}%` }} />
        <div className="h-full bg-sky-500" style={{ width: `${onlinePct}%` }} />
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="flex items-center gap-1 text-slate-500"><span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />Cash</dt>
          <dd className="font-data font-semibold text-slate-900">{formatPeso(cash?.gross)} · {formatPercent(cashPct)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-slate-500"><span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />Online</dt>
          <dd className="font-data font-semibold text-slate-900">{formatPeso(online?.gross)} · {formatPercent(onlinePct)}</dd>
        </div>
      </dl>
    </div>
  );
}
