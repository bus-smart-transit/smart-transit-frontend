import Card from '../../ui/Card';
import { toneOf, OP_SPACE } from './operatorUiTokens';

/**
 * Batch 31: the building blocks of the reworked Operator pages. They sit on the shared Card and the Operator
 * tokens (operatorUiTokens.js) and are used only by Operator pages; the shared StaffPortalLayout and the
 * .staff-* classes that Driver and Chauffeur use are not changed.
 */

/** Page title with at most ONE action (the Batch 21 header rule). */
export function OpPageHeader({ title, subtitle, action = null }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function OpCard({ title, subtitle, badge = null, children, className = '', padding = 'md' }) {
  return (
    <Card padding={padding} className={`min-w-0 ${className}`}>
      {(title || badge) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
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

export function OpStat({ label, value, hint = null, tone = 'neutral', icon: Icon = null }) {
  return (
    <Card padding="sm" className="min-w-0 p-4!">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 flex items-center gap-2 text-xs text-slate-500"><span className={`inline-block h-2 w-2 rounded-full ${toneOf(tone).dot}`} aria-hidden="true" />{hint}</p>}
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

export function OpEmpty({ children }) {
  return <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{children}</p>;
}

/**
 * columns: [{ key, header, render?(row), className? }]. A `render` returns the cell content; without one the cell
 * shows row[key]. Wide tables scroll sideways inside the card instead of breaking the page.
 */
export function OpTable({ columns, rows, rowKey, empty = 'Nothing to show.', caption }) {
  if (!rows.length) return <OpEmpty>{empty}</OpEmpty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map((column) => (
              <th key={column.key} scope="col" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
              {columns.map((column) => (
                <td key={column.key} className={`px-3 py-2 text-slate-700 ${column.className ?? ''}`}>
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
