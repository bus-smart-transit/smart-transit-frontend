/**
 * Batch 61: today's trip on the crew Home, in large text: only what the crew needs at a glance. Every missing value
 * says "Not provided"; nothing is invented. `rows` is a list of [label, value]; `progress` (0-100) is optional.
 */
export default function CrewTodayCard({ title = "Today's trip", route, fromTo, rows = [], progress = null, onOpen = null, openLabel = 'Open trip' }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label={title} data-testid="crew-today-card">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <h2 className="mt-1 text-2xl font-bold leading-tight text-slate-900">{route || 'Not provided'}</h2>
      {fromTo && <p className="mt-1 text-lg text-slate-700">{fromTo}</p>}
      <dl className="mt-4 grid gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-base text-slate-600">{label}</dt>
            <dd className="text-right text-lg font-bold text-slate-900">{value || 'Not provided'}</dd>
          </div>
        ))}
      </dl>
      {progress !== null && (
        <div className="mt-4">
          <div className="h-3 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Trip progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
          </div>
          <p className="mt-1 text-sm text-slate-600">{progress}% of the way</p>
        </div>
      )}
      {onOpen && (
        <button type="button" onClick={onOpen} className="mt-4 min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-4 text-lg font-semibold text-slate-800 hover:bg-slate-50">
          {openLabel}
        </button>
      )}
    </section>
  );
}
