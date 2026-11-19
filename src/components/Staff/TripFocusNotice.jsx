import { useEffect } from 'react';
import { Info, CheckCircle2, AlertTriangle, X } from 'lucide-react';

const TONE = {
  info: { box: 'border-sky-200 bg-sky-50 text-sky-900', Icon: Info },
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-900', Icon: CheckCircle2 },
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-900', Icon: AlertTriangle },
};

/**
 * Batch 27, Task 1: shown when someone arrives from a "New Trip Assignment"
 * notification. It lives in the page body (never in the header, so the Batch 21
 * single-action-button header rule is untouched) and says what became of the
 * trip: still waiting for an answer, already accepted, cancelled, reassigned...
 * Dismissing it is a small text control, not a header action.
 */
export default function TripFocusNotice({ tripId, notice, onDismiss, className = '' }) {
  const state = notice?.state;
  useEffect(() => {
    if (!tripId || !state) return;
    const row = document.getElementById(`trip-row-${tripId}`);
    if (row && typeof row.scrollIntoView === 'function') row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [tripId, state]);

  if (!notice) return null;
  const { box, Icon } = TONE[notice.tone] || TONE.info;

  return (
    <div role="status" data-testid="trip-focus-notice" data-state={notice.state} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${box} ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{notice.title}</p>
        <p className="mt-0.5 text-xs">{notice.message}</p>
      </div>
      <button type="button" onClick={onDismiss} className="shrink-0 rounded p-1 text-xs font-semibold opacity-70 hover:opacity-100" aria-label="Dismiss">
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
