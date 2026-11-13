import { useId, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import Card from '../../ui/Card';
import { toneOf, accentOf, OP_SPACE } from './operatorUiTokens';

/**
 * Batch 31: the building blocks of the reworked Operator pages. They sit on the shared Card and the Operator
 * tokens (operatorUiTokens.js) and are used only by Operator pages; the shared StaffPortalLayout and the
 * .staff-* classes that Driver and Chauffeur use are not changed.
 */

/** Page title with at most ONE action (the Batch 21 header rule). */
export function OpPageHeader({ title, subtitle, eyebrow = null, action = null }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-sm font-medium text-slate-500">{eyebrow}</div>}
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function OpCard({ title, subtitle, badge = null, icon: Icon = null, accent = 'teal', children, className = '', padding = 'md' }) {
  return (
    <Card padding={padding} className={`min-w-0 ${className}`}>
      {(title || badge) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {/* 2026-11-13: a thin outline icon in the card's colour, no grey tile (the reference design). */}
            {Icon && <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${accentOf(accent)}`} strokeWidth={1.5} aria-hidden="true" />}
            <div className="min-w-0">
              {title && <h2 className="font-display text-[1.0625rem] font-semibold leading-snug text-slate-900">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {badge}
        </div>
      )}
      {children}
    </Card>
  );
}

export function OpChip({ tone = 'neutral', children, className = '' }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${toneOf(tone).chip} ${className}`}>
      {children}
    </span>
  );
}

/**
 * 2026-11-13: change against a named earlier period, e.g. "▲ 20% vs yesterday". Green when the number went up, rose
 * when it went down (pass upIsGood={false} where more is worse). Nothing is shown when there is nothing to compare.
 */
export function OpDelta({ current, previous, label, upIsGood = true }) {
  const now = Number(current);
  const before = Number(previous);
  if (!Number.isFinite(now) || !Number.isFinite(before) || before <= 0) return null;
  const pct = Math.round(((now - before) / before) * 100);
  const Arrow = pct > 0 ? ArrowUp : pct < 0 ? ArrowDown : null;
  const tone = pct === 0 ? 'neutral' : (pct > 0) === upIsGood ? 'success' : 'danger';
  const text = `${pct > 0 ? 'Up' : pct < 0 ? 'Down' : 'No change,'} ${Math.abs(pct)}% ${label}`;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" data-testid="op-delta" title={`${before} ${label}`}>
      <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold tabular-nums ${toneOf(tone).chip}`} aria-label={text}>
        {Arrow && <Arrow className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />}
        <span aria-hidden="true">{Math.abs(pct)}%</span>
      </span>
      <span aria-hidden="true">{label}</span>
    </span>
  );
}

/** Monotone cubic path through the points (no overshoot below zero or above a peak). */
function smoothPath(pts) {
  if (pts.length < 2) return '';
  const n = pts.length;
  const d = [];
  for (let i = 0; i < n - 1; i += 1) d.push((pts[i + 1].y - pts[i].y) / (pts[i + 1].x - pts[i].x));
  const m = [d[0], ...d.slice(1).map((s, i) => (s * d[i] <= 0 ? 0 : (s + d[i]) / 2)), d[n - 2]];
  for (let i = 0; i < n - 1; i += 1) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const h = Math.hypot(a, b);
    if (h > 3) { m[i] = (3 * a * d[i]) / h; m[i + 1] = (3 * b * d[i]) / h; }
  }
  let path = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const dx = (pts[i + 1].x - pts[i].x) / 3;
    path += ` C${pts[i].x + dx},${pts[i].y + m[i] * dx} ${pts[i + 1].x - dx},${pts[i + 1].y - m[i + 1] * dx} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return path;
}

/**
 * 2026-11-13: a small trend line for a stat card, in the card's colour, with a soft fill under it. Hovering shows the
 * point's label and value; screen readers get every point in the accessible name. Needs at least two points.
 */
export function OpSparkline({ points, accent = 'slate', label, format = (point) => `${point.label}: ${point.value}` }) {
  const gradientId = useId();
  const [active, setActive] = useState(null);
  if (!Array.isArray(points) || points.length < 2) return null;
  const W = 100;
  const H = 40;
  const PAD = 3;
  const max = Math.max(...points.map((p) => Number(p.value) || 0), 1);
  const pts = points.map((p, i) => ({
    x: (i / (points.length - 1)) * W,
    y: H - PAD - ((Number(p.value) || 0) / max) * (H - PAD * 2),
  }));
  const line = smoothPath(pts);
  const area = `${line} L${W},${H} L0,${H} Z`;
  const onMove = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = box.width > 0 ? (event.clientX - box.left) / box.width : 0;
    setActive(Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))));
  };
  const at = active === null ? null : pts[active];
  return (
    <div
      className={`relative h-12 w-full ${accentOf(accent)}`}
      role="img"
      aria-label={`${label}. ${points.map(format).join(', ')}`}
      data-testid="op-sparkline"
      onPointerMove={onMove}
      onPointerLeave={() => setActive(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {at && <line x1={at.x} x2={at.x} y1="0" y2={H} stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
      </svg>
      {at && (
        <>
          <span
            className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-current shadow"
            style={{ left: `${at.x}%`, top: `${(at.y / H) * 100}%` }}
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute bottom-full z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg"
            style={{ left: `${Math.min(85, Math.max(15, at.x))}%` }}
            aria-hidden="true"
          >
            {format(points[active])}
          </span>
        </>
      )}
    </div>
  );
}

export function OpStat({ label, value, hint = null, tone = 'neutral', icon: Icon = null, accent = 'slate', delta = null, chart = null, className = '' }) {
  return (
    <Card padding="sm" className={`min-w-0 p-4! transition-shadow hover:shadow-card-hover sm:p-5! ${className}`}>
      <div className="min-w-0">
        <p className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500 sm:text-[13px]">
          {Icon && <Icon className={`op-stat-icon h-5 w-5 shrink-0 sm:h-6 sm:w-6 ${accentOf(accent)}`} strokeWidth={1.5} aria-hidden="true" />}
          <span className="min-w-0">{label}</span>
        </p>
        {/* 2026-11-13: the figure on the left, an optional trend line on the right (the reference design). */}
        <div className="mt-2.5 flex items-start justify-between gap-3">
          <div className="min-w-0 shrink-0">
            <p className="font-display text-2xl font-bold leading-none tracking-tight text-slate-900 tabular-nums sm:text-[1.875rem]">{value}</p>
            {delta && <div className="mt-2">{delta}</div>}
          </div>
          {chart && <div className="min-w-0 max-w-32 flex-1">{chart}</div>}
        </div>
      </div>
      {hint && <p className="mt-2.5 flex items-start gap-1.5 text-xs leading-snug text-slate-500 sm:mt-3"><span className={`mt-[4px] inline-block h-2 w-2 shrink-0 rounded-full ${toneOf(tone).dot}`} aria-hidden="true" />{hint}</p>}
    </Card>
  );
}

/** One horizontal bar: `value` of `max`, with the figures written out next to it. */
export function OpBar({ label, value, max, valueLabel, tone = 'info' }) {
  const safeMax = Number(max) > 0 ? Number(max) : 0;
  const pct = safeMax > 0 ? Math.min(100, Math.round((Number(value) / safeMax) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="min-w-0 truncate font-medium text-slate-700">{label}</span>
        <span className="shrink-0 text-slate-500">{valueLabel ?? `${pct}%`}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div className={`h-full rounded-full ${toneOf(tone).bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** A single bar split into segments, with a legend that carries the numbers. */
export function OpStackedBar({ segments }) {
  const shown = segments.filter((segment) => segment.value > 0);
  const total = shown.reduce((sum, segment) => sum + segment.value, 0);
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(', ')}>
        {total > 0 && shown.map((segment) => (
          <div key={segment.key} className={toneOf(segment.tone).bar} style={{ width: `${(segment.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {segments.map((segment) => (
          <li key={segment.key} className="inline-flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${toneOf(segment.tone).dot}`} aria-hidden="true" />
            {segment.label} <strong className="text-slate-900">{segment.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OpEmpty({ children, icon: Icon = null }) {
  if (!Icon) return <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-500">{children}</p>;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3.5">
      <Icon className="h-[18px] w-[18px] shrink-0 text-slate-400" aria-hidden="true" />
      <p className="min-w-0 text-sm text-slate-500">{children}</p>
    </div>
  );
}

/**
 * columns: [{ key, header, render?(row), className? }]. A `render` returns the cell content; without one the cell
 * shows row[key]. Wide tables scroll sideways inside the card instead of breaking the page.
 *
 * Below the `md` breakpoint (Batch 31 phase 5) each row becomes a small card: the header row is hidden visually
 * (it stays for screen readers) and every cell shows its column header before its value. The table roles are set
 * explicitly because a table whose display is changed loses them in some browsers.
 */
export function OpTable({ columns, rows, rowKey, empty = 'Nothing to show.', emptyIcon = null, caption }) {
  if (!rows.length) return <OpEmpty icon={emptyIcon}>{empty}</OpEmpty>;
  return (
    <div className="overflow-x-auto">
      <table role="table" className="w-full text-sm max-md:block">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead role="rowgroup" className="max-md:sr-only">
          <tr role="row" className="border-b border-slate-100">
            {columns.map((column) => (
              <th key={column.key} role="columnheader" scope="col" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup" className="max-md:block">
          {rows.map((row) => (
            <tr key={rowKey(row)} role="row" className="border-b border-slate-50 last:border-0 hover:bg-slate-50 max-md:mb-3 max-md:block max-md:rounded-xl max-md:border max-md:border-slate-200 max-md:p-3 max-md:last:mb-0">
              {columns.map((column) => (
                <td
                  key={column.key}
                  role="cell"
                  data-label={column.header}
                  className={`px-3 py-2 text-slate-700 max-md:flex max-md:items-baseline max-md:justify-between max-md:gap-4 max-md:px-0 max-md:py-1.5 max-md:text-right max-md:whitespace-normal max-md:[&_*]:whitespace-normal before:text-left before:text-xs before:font-semibold before:uppercase before:tracking-wide before:text-slate-500 before:content-[attr(data-label)] md:before:hidden ${column.header ? '' : 'max-md:justify-end'} ${column.className ?? ''}`}
                >
                  {column.render ? column.render(row) : row[column.key] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const OpStack = ({ children, className = '' }) => <div className={`${OP_SPACE.stack} ${className}`}>{children}</div>;

/** Previous / Next under a table. `paging` is what pageOf() returns; nothing shows when everything fits on one page. */
export function OpPager({ paging, onPage, label = 'Pagination', noun = 'items' }) {
  if (!paging || paging.total === 0) return null;
  const buttonClass = 'inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
  return (
    <nav aria-label={label} className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
      <span role="status">Showing {paging.from}-{paging.to} of {paging.total} {noun}</span>
      {paging.pageCount > 1 && (
        <span className="inline-flex items-center gap-2">
          <button type="button" className={buttonClass} disabled={paging.page <= 1} onClick={() => onPage(paging.page - 1)}>Previous</button>
          <span>Page {paging.page} of {paging.pageCount}</span>
          <button type="button" className={buttonClass} disabled={paging.page >= paging.pageCount} onClick={() => onPage(paging.page + 1)}>Next</button>
        </span>
      )}
    </nav>
  );
}
