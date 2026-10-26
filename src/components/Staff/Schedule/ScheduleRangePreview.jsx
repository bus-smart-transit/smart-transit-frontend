import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { formatRangeDay, scheduleButtonLabel } from '../../../utils/scheduleRange'

// Phase B (§4.13): what each day of a From..To schedule will be (preview) or was (result), as the server decided it.
// Nothing is created until the Operator presses the confirm button.

function DayRow({ day, created }) {
  const ok = day.ok === true
  return (
    <li className="flex items-start gap-2 py-1.5 text-sm" data-testid="range-day">
      {ok
        ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
        : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />}
      <span className="w-28 shrink-0 font-semibold text-slate-800">{formatRangeDay(day.date)}</span>
      <span className={ok ? 'text-slate-600' : 'text-rose-700'}>
        {ok ? (created ? 'Scheduled' : 'Will be scheduled') : `Skipped: ${day.reason}`}
      </span>
    </li>
  )
}

export default function ScheduleRangePreview({ preview, result, saving, onConfirm, onDone }) {
  if (result) {
    return (
      <section className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3" aria-live="polite" data-testid="range-result">
        <p className="text-sm font-semibold text-slate-900">{result.message || `${result.create_count} days scheduled`}</p>
        <ul className="divide-y divide-slate-100">
          {(result.days ?? []).map((day) => <DayRow key={day.date} day={day} created />)}
        </ul>
        <div className="flex justify-end pt-1">
          <button type="button" onClick={onDone} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">Done</button>
        </div>
      </section>
    )
  }

  if (!preview) return null

  const createCount = Number(preview.create_count) || 0
  return (
    <section className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3" aria-live="polite" data-testid="range-preview">
      <p className="text-sm font-semibold text-slate-900">
        {createCount} of {(preview.days ?? []).length} days can be scheduled. Nothing is saved until you confirm.
      </p>
      <ul className="divide-y divide-slate-100">
        {(preview.days ?? []).map((day) => <DayRow key={day.date} day={day} />)}
      </ul>
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onConfirm}
          disabled={saving || createCount === 0}
          className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {createCount === 0 ? 'No days to schedule' : scheduleButtonLabel(createCount)}
        </button>
      </div>
    </section>
  )
}
