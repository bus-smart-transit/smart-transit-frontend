import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useFareOptions from '../../api/hooks/Staff/useFareOptions'
import StepUpModal from './StepUpModal'
import { addFormFrom, addFormHasInput, buildFareRulePayload, formatUpdatedAt } from '../../utils/fareRule'
import { getBusinessToday } from '../../utils/dates'
import { FareRuleCopyModal, FareRuleEditModal } from './FareRuleActions'
import Modal from '../ui/Modal'
import Pagination from '../ui/Pagination'

// Batch 53 item 8 (user's design): rules as cards, five a page; the Add form opens in a pop-up; no filters.
const RULES_PER_PAGE = 5

// Batch 31: the Operator page uses the light tone; Admin keeps the dark one (the default).
const TONES = {
  dark: {
    section: 'space-y-4 rounded-2xl border border-slate-700 bg-[#101a30] p-4',
    field: 'rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500',
    title: 'text-slate-300', muted: 'text-slate-400', table: 'text-slate-200', row: 'border-slate-700/70', rule: 'border-slate-700',
    ok: 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200', bad: 'border-red-400/50 bg-red-500/10 text-red-200',
  },
  light: {
    section: 'space-y-4',
    field: 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500',
    title: 'text-slate-500', muted: 'text-slate-500', table: 'text-slate-700', row: 'border-slate-100', rule: 'border-slate-200',
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-700', bad: 'border-rose-200 bg-rose-50 text-rose-700',
  },
}
const EMPTY_FORM = {
  scope: 'general', fleet_id: '', vehicle_class: '', service_type: 'regular', route_id: '', seat_type: 'seated',
  base_fare: '', base_distance_km: '', fare_per_km: '', rounding_mode: '', effective_from: '', effective_to: '', note: '',
}
// When a held extra check runs out (30 seconds early, to be safe). Outside the component: it reads the clock.
const stepUpExpiry = (expiresIn) => Date.now() + Math.max(0, expiresIn - 30) * 1000
const EMPTY_FILTERS = { scope: '', vehicle_class: '', service_type: '', seat_type: '', status: '', route_id: '' }

const cap = (value) => (value ? String(value).charAt(0).toUpperCase() + String(value).slice(1) : '')
const money = (value) => (value === null || value === undefined || value === '' ? '-' : Number(value).toFixed(2))

/**
 * The fare screen for Admin and Operator: the rules in force with filters (class, service type, seat type, scope,
 * route, status) and a form that writes one rule. A general rule (a class and service type, for every bus of that
 * class) is an Admin's; an Operator writes overrides for their own fleets and sees the general rules read only.
 * No fare value lives here: the list and every option come from the server, which re-validates what is saved.
 * `service` supplies getFareRules(filters) and createFareRule(payload, stepUpToken).
 */
export default function FareRulesPanel({ service, fleets = [], routes = [], canCreateGeneral = false, tone = 'dark', readOnly = false }) {
  const t = TONES[tone] ?? TONES.dark
  const options = useFareOptions()
  const [rules, setRules] = useState([])
  const filters = EMPTY_FILTERS
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM, scope: canCreateGeneral ? 'general' : 'fleet' })
  const [message, setMessage] = useState('')
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [stepUpOpen, setStepUpOpen] = useState(false)
  const stepUpRef = useRef(null) // { token, expiresAt }, in memory only

  const routeName = useMemo(() => new Map(routes.map((route) => [Number(route.route_id), route.route_name])), [routes])
  const classLabel = useMemo(() => new Map(options.vehicle_classes.map((entry) => [entry.key, entry.label])), [options.vehicle_classes])

  const load = useCallback(async () => {
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
      const response = await service.getFareRules(params)
      setRules(Array.isArray(response?.data) ? response.data : [])
      setLoadError('')
    } catch (err) {
      setRules([])
      setLoadError(err?.message || 'The fare rules could not be loaded.')
    }
  }, [service, filters])

  useEffect(() => {
    const timer = setTimeout(() => { void load() }, 0)
    return () => clearTimeout(timer)
  }, [load])

  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))

  // 2026-11-06: every fare change (add, copy, edit) needs the extra check. One flow: use the held token, or ask for it
  // and then run the waiting action. Each action resolves to { ok, message }.
  const pendingRef = useRef(null)
  const withStepUp = (action) => new Promise((resolve) => {
    const attempt = async (token) => {
      try {
        resolve({ ok: true, message: await action(token) })
      } catch (err) {
        if (err?.cause?.response?.data?.step_up === true) {
          stepUpRef.current = null
          resolve({ ok: false, message: 'Your verification expired. Please try again.' })
        } else {
          resolve({ ok: false, message: err?.message || 'Could not save. Please try again.' })
        }
      }
    }
    const held = stepUpRef.current
    if (held && held.expiresAt > Date.now()) {
      void attempt(held.token)
      return
    }
    stepUpRef.current = null
    pendingRef.current = { attempt, resolve }
    setStepUpOpen(true)
  })

  const onSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setSaving(true)
    const result = await withStepUp(async (token) => {
      await service.createFareRule(buildFareRulePayload(form), token)
      setForm((prev) => ({ ...prev, base_fare: '', fare_per_km: '', base_distance_km: '', note: '', effective_from: '', effective_to: '' }))
      setCopiedFrom(null)
      await load()
      return 'Fare rule saved.'
    })
    setSaving(false)
    setMessage(result.ok ? result.message : `Failed: ${result.message}`)
  }

  const onVerified = ({ token, expiresIn }) => {
    stepUpRef.current = { token, expiresAt: stepUpExpiry(expiresIn) }
    setStepUpOpen(false)
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending) void pending.attempt(token)
  }

  const onStepUpClosed = () => {
    setStepUpOpen(false)
    const pending = pendingRef.current
    pendingRef.current = null
    pending?.resolve({ ok: false, message: 'Not saved: the check was cancelled.' })
  }

  // 2026-11-06: Copy and Edit. An Operator changes rules of their own buses; general rules stay the Admin's.
  const today = getBusinessToday()
  const [copying, setCopying] = useState(null)
  const [editing, setEditing] = useState(null)
  const canChange = (rule) => !readOnly && (Boolean(rule.fleet_id) || canCreateGeneral)
  const ruleTitle = (rule) => `${ruleScope(rule)}, ${cap(rule.seat_type)}`

  // Batch 49 item 3: "Use in form" copies a row's values into the Add form (nothing saved until Save). If the person
  // already typed something, they are asked first.
  const emptyForm = { ...EMPTY_FORM, scope: canCreateGeneral ? 'general' : 'fleet' }
  const formRef = useRef(null)
  const [copiedFrom, setCopiedFrom] = useState(null)
  const [replacing, setReplacing] = useState(null)
  const fillFrom = (rule) => {
    setForm(addFormFrom(rule, { canCreateGeneral }))
    setCopiedFrom(rule)
    setReplacing(null)
    setMessage('')
    setFormOpen(true)
    formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    formRef.current?.querySelector('input, select')?.focus?.({ preventScroll: true })
  }
  const applyRuleToForm = (rule) => { setFormOpen(true); return addFormHasInput(form, emptyForm) ? setReplacing(rule) : fillFrom(rule) }
  const clearForm = () => {
    setForm(emptyForm)
    setCopiedFrom(null)
    setReplacing(null)
  }
  const copyRule = (rule, payload) => withStepUp(async (token) => {
    await service.copyFareRule(rule.fare_rule_id, payload, token)
    await load()
    setMessage('Fare copied. The current fare ends the day before the copy starts.')
    return 'Fare copied.'
  })
  const editRule = (rule, payload) => withStepUp(async (token) => {
    await service.updateFareRule(rule.fare_rule_id, payload, token)
    await load()
    setMessage('Fare rule updated.')
    return 'Fare rule updated.'
  })

  const ruleScope = (rule) => (rule.fleet_id ? `Fleet ${rule.fleet?.plate_number ?? `#${rule.fleet_id}`}` : 'General')

  return (
    <section className={t.section} data-testid="fare-rules-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
        <h3 className={`text-sm font-semibold uppercase tracking-[0.14em] ${t.title}`}>Fare Rules</h3>
        <p className={`mt-1 text-xs ${t.muted}`}>
          A fare is found for the trip&apos;s bus: the fleet&apos;s own rule first, then the general rule for its class and service type. With no rule the fare is unavailable and nothing is sold.
          {!canCreateGeneral && ' General rules are set by the Admin; you can add rules for your own fleets.'}
        </p>
        </div>
        {!readOnly && (
          <button type="button" onClick={() => { setMessage(''); setFormOpen(true) }} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500">+ Add fare rule</button>
        )}
      </div>
      {message && !formOpen && (
        <p role="status" className={`rounded-xl border px-3 py-2 text-sm ${message.toLowerCase().startsWith('failed') ? t.bad : t.ok}`}>{message}</p>
      )}

      {rules.length === 0 ? (
        <p className={`text-sm ${t.muted}`}>{loadError || 'No fare rules yet.'}</p>
      ) : (
        <ul className={`divide-y ${t.rule}`} aria-label="Fare rules" data-testid="fare-rules-table">
          {rules.slice((page - 1) * RULES_PER_PAGE, page * RULES_PER_PAGE).map((rule) => {
            const cls = rule.vehicle_class_label || classLabel.get(rule.vehicle_class) || classLabel.get(rule.fleet?.vehicle_class) || 'Any class'
            const active = rule.status !== 'inactive'
            return (
              <li key={rule.fare_rule_id} className="py-4" data-testid="fare-rule-row">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-base font-bold ${t.title}`}>{rule.fleet_id ? (rule.fleet?.plate_number ?? `Fleet #${rule.fleet_id}`) : `General · ${cls}`} · {cap(rule.service_type)}</p>
                    <p className={`text-xs ${t.muted}`}>{cap(rule.seat_type)} · {rule.route_id ? (routeName.get(Number(rule.route_id)) ?? `Route #${rule.route_id}`) : 'All routes'} · {cls}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{active ? 'Active' : 'Stopped'}</span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-3">
                  <div><dt className={`text-xs ${t.muted}`}>Base fare</dt><dd className={`text-base font-bold ${t.title}`}>{money(rule.base_fare)}</dd></div>
                  <div><dt className={`text-xs ${t.muted}`}>Per kilometer</dt><dd className={`text-base font-bold ${t.title}`}>{money(rule.fare_per_km)}</dd></div>
                  <div className="text-right"><dt className={`text-xs ${t.muted}`}>Rounding</dt><dd className={`text-base font-bold ${t.title}`}>{cap(rule.rounding_mode)}</dd></div>
                </dl>
                <p className={`mt-2 text-xs ${t.muted}`}>
                  Base distance {rule.base_distance_km === null || rule.base_distance_km === undefined ? 'not set' : `${Number(rule.base_distance_km)} km`} · from {rule.effective_from ? String(rule.effective_from).slice(0, 10) : 'Not provided'}{rule.effective_to ? ` to ${String(rule.effective_to).slice(0, 10)}` : ''} · updated <span data-testid="fare-rule-updated">{formatUpdatedAt(rule.updated_at)}</span>{rule.note ? ` · ${rule.note}` : ''}
                </p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {!readOnly && (
                    <button type="button" onClick={() => applyRuleToForm(rule)} aria-label={`Use fare ${ruleTitle(rule)} in the form`} className="min-h-9 whitespace-nowrap rounded-full border border-navy-300 px-3 text-xs font-semibold text-navy-800 hover:bg-navy-50">Use in form</button>
                  )}
                  {canChange(rule) && (
                    <>
                      <button type="button" onClick={() => setCopying(rule)} aria-label={`Copy fare ${ruleTitle(rule)}`} className="min-h-9 rounded-full border border-teal-300 px-3 text-xs font-semibold text-teal-700 hover:bg-teal-50">Copy</button>
                      <button type="button" onClick={() => setEditing(rule)} aria-label={`Edit fare ${ruleTitle(rule)}`} className="min-h-9 rounded-full border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100">Edit</button>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {rules.length > RULES_PER_PAGE && (
        <Pagination page={page} perPage={RULES_PER_PAGE} total={rules.length} lastPage={Math.ceil(rules.length / RULES_PER_PAGE)} onPageChange={setPage} label="Fare rule pages" />
      )}

      {readOnly ? (
        <p className={`border-t pt-4 text-xs ${t.muted} ${t.rule}`} data-testid="fare-read-only-note">Only your company admin can change fares.</p>
      ) : <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add fare rule" size="lg">
      <form ref={formRef} onSubmit={onSubmit} className="space-y-3" aria-label="Add fare rule">
        {replacing && (
          <div role="alertdialog" aria-label="Replace the form" className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span>Replace what you typed with the {ruleTitle(replacing)} rule?</span>
            <button type="button" onClick={() => fillFrom(replacing)} className="min-h-9 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700">Replace</button>
            <button type="button" onClick={() => setReplacing(null)} className="min-h-9 rounded-lg border border-amber-300 px-3 text-xs font-semibold">Keep what I typed</button>
          </div>
        )}
        {copiedFrom && (
          <p data-testid="fare-copied-note" className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm ${t.ok}`}>
            <span>Copied from the {ruleTitle(copiedFrom)} rule. Change what you need, then save.{form.scope === 'fleet' && !form.fleet_id ? ' Pick the fleet.' : ''}</span>
            <button type="button" onClick={clearForm} className="min-h-9 rounded-lg border border-current px-3 text-xs font-semibold">Clear</button>
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-4">
          {canCreateGeneral && (
            <select aria-label="Rule applies to" value={form.scope} onChange={set('scope')} className={t.field}>
              <option value="general">General (a vehicle class)</option>
              <option value="fleet">One fleet (override)</option>
            </select>
          )}
          {form.scope === 'fleet' ? (
            <select aria-label="Fleet" value={form.fleet_id} onChange={set('fleet_id')} required className={t.field}>
              <option value="">Fleet</option>
              {fleets.map((fleet) => <option key={fleet.fleet_id} value={fleet.fleet_id}>{fleet.plate_number}</option>)}
            </select>
          ) : (
            <select aria-label="Vehicle class" value={form.vehicle_class} onChange={set('vehicle_class')} required className={t.field}>
              <option value="">Vehicle class</option>
              {options.vehicle_classes.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
            </select>
          )}
          <select aria-label="Service type" value={form.service_type} onChange={set('service_type')} className={t.field}>
            {options.service_types.map((type) => <option key={type} value={type}>{cap(type)}</option>)}
          </select>
          <select aria-label="Seat type" value={form.seat_type} onChange={set('seat_type')} className={t.field}>
            {options.seat_types.map((type) => <option key={type} value={type}>{cap(type)}</option>)}
          </select>
          {form.scope === 'general' && (
            <select aria-label="Route (optional)" value={form.route_id} onChange={set('route_id')} className={t.field}>
              <option value="">All routes</option>
              {routes.map((route) => <option key={route.route_id} value={route.route_id}>{route.route_name}</option>)}
            </select>
          )}
          <input aria-label="Base fare" type="number" min="0" step="0.01" value={form.base_fare} onChange={set('base_fare')} required placeholder="Base fare" className={t.field} />
          <input aria-label="Base distance in km" type="number" min="0" step="0.1" value={form.base_distance_km} onChange={set('base_distance_km')} placeholder="Base distance (km), optional" className={t.field} />
          <input aria-label="Fare per km" type="number" min="0" step="0.01" value={form.fare_per_km} onChange={set('fare_per_km')} required placeholder="Fare / km" className={t.field} />
          <select aria-label="Rounding" value={form.rounding_mode} onChange={set('rounding_mode')} className={t.field}>
            <option value="">Rounding: server default</option>
            {options.rounding_modes.map((mode) => <option key={mode} value={mode}>{cap(mode)}</option>)}
          </select>
          <label className={`text-xs ${t.muted}`}>Effective from<input type="date" value={form.effective_from} onChange={set('effective_from')} className={`${t.field} mt-1 w-full`} /></label>
          <label className={`text-xs ${t.muted}`}>Effective to<input type="date" value={form.effective_to} onChange={set('effective_to')} className={`${t.field} mt-1 w-full`} /></label>
          <input aria-label="Note" maxLength={255} value={form.note} onChange={set('note')} placeholder="Note (optional)" className={`${t.field} md:col-span-2`} />
        </div>
        <button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">{saving ? 'Saving...' : 'Save fare rule'}</button>
        {message && (
          <p role="status" className={`rounded-xl border px-3 py-2 text-sm ${message.toLowerCase().startsWith('failed') ? t.bad : t.ok}`}>{message}</p>
        )}
      </form>
      </Modal>}
      {copying && <FareRuleCopyModal rule={copying} today={today} title={ruleTitle(copying)} onClose={() => setCopying(null)} onSubmit={(payload) => copyRule(copying, payload)} />}
      {editing && <FareRuleEditModal rule={editing} today={today} title={ruleTitle(editing)} onClose={() => setEditing(null)} onSubmit={(payload) => editRule(editing, payload)} />}
      <StepUpModal open={stepUpOpen} onClose={onStepUpClosed} onVerified={onVerified} />
    </section>
  )
}
