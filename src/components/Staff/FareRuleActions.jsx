import { useState } from 'react'
import Modal from '../ui/Modal'
import { copyFormFrom, buildCopyPayload, earliestCopyStart, originalEndsOn, ruleStarted } from '../../utils/fareRule'

// 2026-11-06: Copy and Edit for one fare rule. The server decides (FareRuleService::copyRule / updateRule); these
// forms only help. `onSubmit(payload)` resolves to { ok, message }.

const FIELD = 'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500'
const LABEL = 'block text-xs font-semibold text-slate-700'

function Buttons({ saving, label, onCancel }) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onCancel} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
      <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{saving ? 'Saving...' : label}</button>
    </div>
  )
}

function useSubmit(onSubmit, onClose) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const run = async (payload) => {
    setSaving(true)
    setError('')
    const result = await onSubmit(payload)
    setSaving(false)
    if (result?.ok) onClose()
    else setError(result?.message || 'Could not save. Please try again.')
  }
  return { saving, error, run }
}

/** Copy: the same fare from a later date, prices filled in; the current one ends the day before. */
export function FareRuleCopyModal({ rule, today, title, onClose, onSubmit }) {
  const [form, setForm] = useState(() => copyFormFrom(rule, today))
  const { saving, error, run } = useSubmit(onSubmit, onClose)
  const min = earliestCopyStart(rule, today)
  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))

  return (
    <Modal open onClose={onClose} title={`Copy fare: ${title}`}>
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void run(buildCopyPayload(form)) }} aria-label="Copy fare rule">
        <p className="text-sm text-slate-600">The copy starts on a later date. The current fare ends the day before, on <strong data-testid="copy-original-ends">{originalEndsOn(form.effective_from || min)}</strong>.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={LABEL}>Starts on<input type="date" aria-label="Copy starts on" min={min} required value={form.effective_from} onChange={set('effective_from')} className={`${FIELD} mt-1`} /></label>
          <label className={LABEL}>Ends on (optional)<input type="date" aria-label="Copy ends on" min={form.effective_from || min} value={form.effective_to} onChange={set('effective_to')} className={`${FIELD} mt-1`} /></label>
          <label className={LABEL}>Base fare<input type="number" min="0" step="0.01" required value={form.base_fare} onChange={set('base_fare')} className={`${FIELD} mt-1`} /></label>
          <label className={LABEL}>Base distance (km)<input type="number" min="0" step="0.1" value={form.base_distance_km} onChange={set('base_distance_km')} className={`${FIELD} mt-1`} /></label>
          <label className={LABEL}>Fare per km after<input type="number" min="0" step="0.01" required value={form.fare_per_km} onChange={set('fare_per_km')} className={`${FIELD} mt-1`} /></label>
          <label className={LABEL}>Note (optional)<input maxLength={255} value={form.note} onChange={set('note')} className={`${FIELD} mt-1`} /></label>
        </div>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <Buttons saving={saving} label="Save copy" onCancel={onClose} />
      </form>
    </Modal>
  )
}

/**
 * Edit: a fare in use can be ended or stopped ("no longer followed") and given a note; its prices stay, because
 * tickets were sold with them. A fare that has not started may change everything.
 */
export function FareRuleEditModal({ rule, today, title, onClose, onSubmit }) {
  const started = ruleStarted(rule, today)
  const [form, setForm] = useState({
    effective_to: rule.effective_to ? String(rule.effective_to).slice(0, 10) : '',
    stopped: rule.status === 'inactive',
    note: rule.note ?? '',
    base_fare: rule.base_fare ?? '',
    fare_per_km: rule.fare_per_km ?? '',
    base_distance_km: rule.base_distance_km ?? '',
    effective_from: rule.effective_from ? String(rule.effective_from).slice(0, 10) : '',
  })
  const { saving, error, run } = useSubmit(onSubmit, onClose)
  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))

  const payload = () => {
    const body = { effective_to: form.effective_to || null, status: form.stopped ? 'inactive' : 'active', note: form.note.trim() || null }
    if (!started) {
      Object.assign(body, {
        base_fare: Number(form.base_fare),
        fare_per_km: Number(form.fare_per_km),
        base_distance_km: form.base_distance_km === '' ? null : Number(form.base_distance_km),
        effective_from: form.effective_from || null,
      })
    }
    return body
  }

  return (
    <Modal open onClose={onClose} title={`Edit fare: ${title}`}>
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void run(payload()) }} aria-label="Edit fare rule">
        {started && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" data-testid="fare-in-use-note">
            This fare is already in use, so its prices stay. To change prices, use Copy and choose a later start date.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {!started && (
            <>
              <label className={LABEL}>Base fare<input type="number" min="0" step="0.01" required value={form.base_fare} onChange={set('base_fare')} className={`${FIELD} mt-1`} /></label>
              <label className={LABEL}>Fare per km after<input type="number" min="0" step="0.01" required value={form.fare_per_km} onChange={set('fare_per_km')} className={`${FIELD} mt-1`} /></label>
              <label className={LABEL}>Base distance (km)<input type="number" min="0" step="0.1" value={form.base_distance_km} onChange={set('base_distance_km')} className={`${FIELD} mt-1`} /></label>
              <label className={LABEL}>Starts on<input type="date" min={today} value={form.effective_from} onChange={set('effective_from')} className={`${FIELD} mt-1`} /></label>
            </>
          )}
          <label className={LABEL}>Ends on (optional)<input type="date" aria-label="Ends on" min={started ? today : (form.effective_from || today)} value={form.effective_to} onChange={set('effective_to')} className={`${FIELD} mt-1`} /></label>
          <label className={LABEL}>Note (optional)<input aria-label="Note" maxLength={255} value={form.note} onChange={set('note')} className={`${FIELD} mt-1`} /></label>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm text-slate-800">
          <input type="checkbox" checked={form.stopped} onChange={set('stopped')} className="h-5 w-5 rounded border-slate-300" />
          Stop using this fare (no longer followed)
        </label>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <Buttons saving={saving} label="Save changes" onCancel={onClose} />
      </form>
    </Modal>
  )
}
