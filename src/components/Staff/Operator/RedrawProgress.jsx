import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatElapsed } from '../../../utils/operatorRouteView';

// How long a redraw may sit in "Waiting to start" before the page suggests the background worker is not running.
const STALLED_AFTER_S = 45;

// The server reports the elapsed time on every check; between checks this counts the seconds locally. It is rendered
// with a key built from the server's numbers, so each new report restarts the count from the server's value.
function PendingBar({ redraw }) {
  const [extra, setExtra] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setExtra((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const elapsed = Number(redraw?.elapsed_s ?? 0) + extra;
  const percent = redraw?.percent !== null && Number.isFinite(Number(redraw?.percent)) ? Math.max(0, Math.min(100, Number(redraw.percent))) : null;
  const typical = Number(redraw?.typical_s) > 0 ? Number(redraw.typical_s) : null;
  const stalled = (redraw?.stage ?? 'queued') === 'queued' && elapsed >= STALLED_AFTER_S;

  return (
    <div className="mb-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3" data-testid="redraw-progress">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span role="status" className="font-semibold text-teal-900">Redrawing the route line: {redraw?.stage_label ?? 'Working'}</span>
        <span className="text-xs text-teal-800">
          {percent !== null && `${percent}% · `}Running for {formatElapsed(elapsed)}
          {typical ? ` · usually about ${formatElapsed(typical)}` : ' · usually under a minute'}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Route line redraw progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        className="mt-2 h-2 overflow-hidden rounded-full bg-teal-100"
      >
        <div className={`h-full rounded-full bg-teal-600 transition-all duration-500 ${percent === null ? 'w-1/3 animate-pulse' : ''}`} style={percent === null ? undefined : { width: `${percent}%` }} />
      </div>
      {stalled && (
        <p className="mt-2 text-xs text-amber-800">
          Still waiting to start. If this stays here for more than a minute, ask an administrator to check that the background worker is running.
        </p>
      )}
    </div>
  );
}

/**
 * The redraw of a route line: a progress bar while it runs, and a clear result once it is over.
 * `redraw` is what the server reports (stage, percent, elapsed_s, typical_s); `outcome` is the finished result
 * ({ ok, message, duration_s }) kept on screen until it is dismissed or another redraw starts.
 */
export default function RedrawProgress({ pending, redraw, outcome, onDismiss }) {
  if (pending) return <PendingBar key={`${redraw?.requested_at ?? ''}:${redraw?.elapsed_s ?? ''}:${redraw?.stage ?? ''}`} redraw={redraw} />;

  if (!outcome) return null;
  const ok = outcome.ok !== false;
  const hasDuration = outcome.duration_s !== null && outcome.duration_s !== undefined && Number(outcome.duration_s) >= 0;
  const took = hasDuration ? ` It took ${formatElapsed(Number(outcome.duration_s))}.` : '';

  return (
    <div
      role={ok ? 'status' : 'alert'}
      className={`mb-3 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}
      data-testid="redraw-outcome"
    >
      <span className="flex items-start gap-2">
        {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
        <span>
          {ok
            ? <><strong>Route line redrawn.</strong>{took} The map now shows the new line.</>
            : <><strong>The route line was not redrawn.</strong> {outcome.message ? `${outcome.message} ` : ''}The previous line was kept.</>}
        </span>
      </span>
      {onDismiss && <button type="button" onClick={onDismiss} className="shrink-0 text-xs font-semibold underline">Dismiss</button>}
    </div>
  );
}