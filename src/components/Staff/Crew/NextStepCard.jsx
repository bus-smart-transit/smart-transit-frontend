import { ArrowRight } from 'lucide-react';

/**
 * Batch 61 (advisor, via the user, 2026-11-13): the crew Home's one big button, the next thing to do. The step comes
 * from utils/crewNextStep.js; a step that cannot be done yet stays visible, disabled, with the reason under it.
 */
export default function NextStepCard({ step, onPress, children = null }) {
  if (!step) return null;
  const { key, title, label, hint, disabled = false, reason = '' } = step;
  const danger = key === 'endTrip' || key === 'endShift';
  return (
    <section className="rounded-2xl border-2 border-teal-200 bg-white p-5 shadow-sm" aria-label="Next step" data-testid="crew-next-step" data-step={key}>
      <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Next step</p>
      <h2 className="mt-1 text-2xl font-bold leading-tight text-slate-900">{title}</h2>
      {hint && <p className="mt-2 text-base text-slate-700">{hint}</p>}
      {children}
      {label && (
        <button
          type="button"
          onClick={() => onPress(key)}
          disabled={disabled}
          className={`mt-4 flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl px-5 text-xl font-bold text-white shadow transition disabled:cursor-not-allowed disabled:opacity-50 ${
            danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-teal-600 hover:bg-teal-700'
          }`}
        >
          {label} <ArrowRight className="h-6 w-6" aria-hidden="true" />
        </button>
      )}
      {reason && <p role="status" className="mt-3 text-base font-semibold text-amber-800" data-testid="next-step-reason">{reason}</p>}
    </section>
  );
}
