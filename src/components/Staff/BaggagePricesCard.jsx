import { useEffect, useState } from 'react'

const peso = (value) => `PHP ${Number(value || 0).toFixed(2)}`

/**
 * 2026-11-25 (user): the company's baggage prices by size. Passengers only say online that they bring baggage; the
 * Chauffeur picks the size on board and takes the cash at these prices. `load()` resolves to the price list; `save`
 * (prices) resolves to { ok, message } and runs the same extra check as fare changes (the parent's withStepUp).
 */
export default function BaggagePricesCard({ load, save, readOnly = false, tone }) {
  const [fees, setFees] = useState([])
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    load()
      .then((list) => { if (active) setFees(Array.isArray(list) ? list : []) })
      .catch((err) => { if (active) setError(err?.message || 'Baggage prices could not be loaded.') })
    return () => { active = false }
  }, [load])

  const startEdit = () => {
    setMessage('')
    setDraft(Object.fromEntries(fees.map((fee) => [fee.key, String(fee.amount)])))
  }
  const invalid = draft ? Object.values(draft).some((value) => value === '' || !Number.isFinite(Number(value)) || Number(value) < 0) : false
  const onSave = async () => {
    setSaving(true)
    const result = await save(Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, Number(value)])))
    setSaving(false)
    if (result.ok) {
      if (Array.isArray(result.fees)) setFees(result.fees)
      setDraft(null)
    }
    setMessage(result.ok ? 'Baggage prices saved.' : `Failed: ${result.message}`)
  }

  return (
    <div className={`rounded-xl border p-4 ${tone.rule}`} data-testid="baggage-prices">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className={`text-sm font-bold ${tone.title}`}>Baggage prices</h4>
          <p className={`mt-1 text-xs ${tone.muted}`}>Paid in cash to the Chauffeur on board. The Chauffeur picks the size of the baggage. Online, passengers only say they bring baggage.</p>
        </div>
        {!readOnly && !draft && fees.length > 0 && (
          <button type="button" onClick={startEdit} className="min-h-9 rounded-full border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100">Edit prices</button>
        )}
      </div>
      {error && <p className={`mt-2 text-sm ${tone.muted}`}>{error}</p>}
      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        {fees.map((fee) => (
          <div key={fee.key}>
            <dt className={`text-xs ${tone.muted}`}>{fee.label} <span className="block">{fee.hint}</span></dt>
            <dd className={`mt-1 text-base font-bold ${tone.title}`}>
              {draft ? (
                <input
                  aria-label={`${fee.label} baggage price`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft[fee.key] ?? ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [fee.key]: e.target.value }))}
                  className={`${tone.field} w-full`}
                />
              ) : peso(fee.amount)}
            </dd>
          </div>
        ))}
      </dl>
      {draft && (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button type="button" disabled={saving} onClick={() => setDraft(null)} className="min-h-9 rounded-full border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60">Cancel</button>
          <button type="button" disabled={saving || invalid} onClick={onSave} className="min-h-9 rounded-full bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">{saving ? 'Saving...' : 'Save prices'}</button>
        </div>
      )}
      {message && <p role="status" className={`mt-2 rounded-xl border px-3 py-2 text-sm ${message.startsWith('Failed') ? tone.bad : tone.ok}`}>{message}</p>}
    </div>
  )
}
