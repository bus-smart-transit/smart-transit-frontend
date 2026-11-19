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
      <div className="mt-1 flex gap-0.5 text-xs text-slate-500" aria-hidden="true">
        {list.map((h) => (
          <span key={h.hour} className="flex-1 text-center">{h.hour % 3 === 0 ? `${Number(h.hour) % 12 === 0 ? 12 : Number(h.hour) % 12} ${Number(h.hour) < 12 ? 'AM' : 'PM'}` : ''}</span>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">Busiest hour: {busiest.label} ({formatPeso(busiest.gross)}, {formatCount(busiest.tickets)} tickets).</p>
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

/**
 * Batch 81 (user, 2026-11-19): the revenue trend of the Finance overview. A line with a soft fill, one point per day (or
 * per hour for a single day), the last point labelled, and a few amounts on the side. Plain SVG (no chart library);
 * screen readers get every point in the accessible name.
 */
export function TrendChart({ points = [], label = 'Gross revenue', format = formatPeso }) {
  if (points.length === 0) return <p className="text-sm text-slate-500">Nothing to show for this range.</p>;
  const W = 600;
  const H = 200;
  const PAD = { left: 64, right: 32, top: 24, bottom: 28 };
  const max = Math.max(...points.map((p) => Number(p.value) || 0), 1);
  const nice = (() => { const step = 10 ** Math.floor(Math.log10(max)); return Math.ceil(max / step) * step; })();
  const x = (i) => PAD.left + (points.length === 1 ? (W - PAD.left - PAD.right) / 2 : (i / (points.length - 1)) * (W - PAD.left - PAD.right));
  const y = (v) => PAD.top + (1 - (Number(v) || 0) / nice) * (H - PAD.top - PAD.bottom);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - PAD.bottom} L${x(0).toFixed(1)},${H - PAD.bottom} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => nice * f);
  const every = Math.max(1, Math.ceil(points.length / 7));
  const last = points[points.length - 1];
  return (
    // Batch 81: on a phone the chart keeps a readable width and scrolls sideways inside its card.
    <div className="-mx-1 w-full overflow-x-auto px-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-52 w-full min-w-[34rem]" role="img" aria-label={`${label}. ${points.map((p) => `${p.label}: ${format(p.value)}`).join(', ')}`} data-testid="trend-chart">
        <defs>
          <linearGradient id="fin-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="#64748b">{format(t).replace(/\.00$/, '')}</text>
          </g>
        ))}
        <path d={area} fill="url(#fin-trend-fill)" />
        <path d={line} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={p.label} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 5 : 3.5} fill="#ffffff" stroke="#16a34a" strokeWidth="2">
            <title>{`${p.label}: ${format(p.value)}`}</title>
          </circle>
        ))}
        {points.map((p, i) => (i % every === 0 || i === points.length - 1) && (
          <text key={`l-${p.label}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="12" fill="#64748b">{p.label}</text>
        ))}
        <g transform={`translate(${Math.min(x(points.length - 1), W - PAD.right - 44)}, ${Math.max(14, y(last.value) - 16)})`}>
          <rect x="-44" y="-14" width="88" height="22" rx="6" fill="#166534" />
          <text x="0" y="2" textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffffff">{format(last.value).replace(/\.00$/, '')}</text>
        </g>
      </svg>
    </div>
  );
}

const CHANNEL_COLORS = ['#166534', '#2563eb', '#0d9488', '#9333ea', '#ea580c'];

/**
 * Batch 81: the payment channels as a ring (each channel's share of gross) with the total in the middle and a legend
 * with each channel's amount and percent. The figures are the server's channel rows.
 */
export function ChannelRing({ channels = [], total = 0 }) {
  const rows = (channels || []).filter((c) => Number(c.gross) > 0);
  if (rows.length === 0) return <p className="text-sm text-slate-500">No sales in this range.</p>;
  const R = 52;
  const C = 2 * Math.PI * R;
  // Each segment starts where the ones before it end.
  const segments = rows.map((c, i) => {
    const dash = (Math.max(0, Number(c.percent) || 0) / 100) * C;
    const start = rows.slice(0, i).reduce((sum, prev) => sum + (Math.max(0, Number(prev.percent) || 0) / 100) * C, 0);
    return { key: `${c.method}-${c.channel}`, dash, start, color: CHANNEL_COLORS[i % CHANNEL_COLORS.length] };
  });
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <svg viewBox="0 0 140 140" className="h-40 w-40 shrink-0" role="img" aria-label={`Revenue by payment method. ${rows.map((c) => `${c.label}: ${formatPeso(c.gross)}, ${formatPercent(c.percent)}`).join('; ')}`} data-testid="channel-ring">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#e2e8f0" strokeWidth="18" />
        {segments.map((seg) => (
          <circle key={seg.key} cx="70" cy="70" r={R} fill="none" stroke={seg.color} strokeWidth="18" strokeDasharray={`${seg.dash} ${C - seg.dash}`} strokeDashoffset={-seg.start} transform="rotate(-90 70 70)" />
        ))}
        <text x="70" y="68" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0f172a">{formatPeso(total).replace(/\.\d{2}$/, '')}</text>
        <text x="70" y="86" textAnchor="middle" fontSize="10" fill="#64748b">Gross revenue</text>
      </svg>
      <ul className="w-full space-y-2.5 text-sm">
        {rows.map((c, i) => (
          <li key={`${c.method}-${c.channel}`} className="flex items-center gap-3">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }} aria-hidden="true" />
            <span className="min-w-0 flex-1 text-slate-700">{c.label}<span className="block text-xs text-slate-500">{formatCount(c.tickets)} tickets · {formatPeso(c.gross)}</span></span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">{formatPercent(c.percent)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
