import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useFareOptions from '../../api/hooks/Staff/useFareOptions'
import StepUpModal from './StepUpModal'
import { buildFareRulePayload } from '../../utils/fareRule'

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
export default function FareRulesPanel({ service, fleets = [], routes = [], canCreateGeneral = false, tone = 'dark' }) {
  const t = TONES[tone] ?? TONES.dark
  const options = useFareOptions()
  const [rules, setRules] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
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
  const setFilter = (field) => (event) => setFilters((prev) => ({ ...prev, [field]: event.target.value }))

  const submit = async (token) => {
    setMessage('')
    setSaving(true)
    try {
      await service.createFareRule(buildFareRulePayload(form), token)
      setForm((prev) => ({ ...prev, base_fare: '', fare_per_km: '', base_distance_km: '', note: '', effective_from: '', effective_to: '' }))
      setMessage('Fare rule saved.')
      await load()
    } catch (err) {
      if (err?.cause?.response?.data?.step_up === true) {
        stepUpRef.current = null
        setStepUpOpen(true)
        setMessage('Failed: your verification expired. Confirm your password to continue.')
      } else {
        setMessage(`Failed: ${err?.message || 'the fare rule could not be saved.'}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const onSubmit = (event) => {
    event.preventDefault()
    const held = stepUpRef.current
    if (held && held.expiresAt > Date.now()) return submit(held.token)
    stepUpRef.current = null
    setStepUpOpen(true)
    return undefined
  }

  const onVerified = ({ token, expiresIn }) => {
    stepUpRef.current = { token, expiresAt: Date.now() + Math.max(0, expiresIn - 30) * 1000 }
    setStepUpOpen(false)
    void submit(token)
  }

  const ruleScope = (rule) => (rule.fleet_id ? `Fleet ${rule.fleet?.plate_number ?? `#${rule.fleet_id}`}` : 'General')

  return (
    <section className={t.section} data-testid="fare-rules-panel">
      <div>
        <h3 className={`text-sm font-semibold uppercase tracking-[0.14em] ${t.title}`}>Fare Rules</h3>
        <p className={`mt-1 text-xs ${t.muted}`}>
          A fare is found for the trip&apos;s bus: the fleet&apos;s own rule first, then the general rule for its class and service type. With no rule the fare is unavailable and nothing is sold.
          {!canCreateGeneral && ' General rules are set by the Admin; you can add rules for your own fleets.'}
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-6" role="group" aria-label="Fare rule filters">
        <select aria-label="Filter by scope" value={filters.scope} onChange={setFilter('scope')} className={t.field}>
          <option value="">All rules</option><option value="general">General</option><option value="fleet">Fleet override</option>
        </select>
        <select aria-label="Filter by vehicle class" value={filters.vehicle_class} onChange={setFilter('vehicle_class')} className={t.field}>
          <option value="">Any class</option>
          {options.vehicle_classes.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
        </select>
        <select aria-label="Filter by service type" value={filters.service_type} onChange={setFilter('service_type')} className={t.field}>
          <option value="">Any service</option>
          {options.service_types.map((type) => <option key={type} value={type}>{cap(type)}</option>)}
        </select>
        <select aria-label="Filter by seat type" value={filters.seat_type} onChange={setFilter('seat_type')} className={t.field}>
          <option value="">Any seat type</option>
          {options.seat_types.map((type) => <option key={type} value={type}>{cap(type)}</option>)}
        </select>
        <select aria-label="Filter by route" value={filters.route_id} onChange={setFilter('route_id')} className={t.field}>
          <option value="">Any route</option>
          {routes.map((route) => <option key={route.route_id} value={route.route_id}>{route.route_name}</option>)}
        </select>
        <select aria-label="Filter by status" value={filters.status} onChange={setFilter('status')} className={t.field}>
          <option value="">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-xs ${t.table}" data-testid="fare-rules-table">
          <thead className={t.muted}>
            <tr>
              {['Applies to', 'Class', 'Service', 'Route', 'Seat', 'Base fare', 'Base km', 'Per km', 'Rounding', 'From', 'To', 'Note'].map((heading) => (
                <th key={heading} className="px-2 py-1.5 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr><td colSpan={12} className={`px-2 py-4 text-left ${t.muted}`}>{loadError || 'No fare rules match.'}</td></tr>
            ) : rules.map((rule) => (
              <tr key={rule.fare_rule_id} className={`border-t ${t.row}`} data-testid="fare-rule-row">
                <td className="px-2 py-1.5">{ruleScope(rule)}</td>
                <td className="px-2 py-1.5">{rule.vehicle_class_label || classLabel.get(rule.vehicle_class) || classLabel.get(rule.fleet?.vehicle_class) || 'Not specified'}</td>
                <td className="px-2 py-1.5">{cap(rule.service_type)}</td>
                <td className="px-2 py-1.5">{rule.route_id ? (routeName.get(Number(rule.route_id)) ?? `#${rule.route_id}`) : 'All routes'}</td>
                <td className="px-2 py-1.5">{cap(rule.seat_type)}</td>
                <td className="px-2 py-1.5">{money(rule.base_fare)}</td>
                <td className="px-2 py-1.5">{rule.base_distance_km === null || rule.base_distance_km === undefined ? '-' : Number(rule.base_distance_km)}</td>
                <td className="px-2 py-1.5">{money(rule.fare_per_km)}</td>
                <td className="px-2 py-1.5">{cap(rule.rounding_mode)}</td>
                <td className="px-2 py-1.5">{rule.effective_from ? String(rule.effective_from).slice(0, 10) : '-'}</td>
                <td className="px-2 py-1.5">{rule.effective_to ? String(rule.effective_to).slice(0, 10) : '-'}</td>
                <td className={`px-2 py-1.5 ${t.muted}`}>{rule.note || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={onSubmit} className={`space-y-3 border-t pt-4 ${t.rule}`} aria-label="Add fare rule">
        <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${t.title}`}>Add a rule</p>
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
      <StepUpModal open={stepUpOpen} onClose={() => setStepUpOpen(false)} onVerified={onVerified} />
    </section>
  )
}
