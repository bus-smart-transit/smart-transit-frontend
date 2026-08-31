import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import StaffService from '../../api/StaffService/StaffService'
import {
  LayoutDashboard, Bus, MapPin, Clock, PieChart, Users, Settings,
  LogOut, AlertCircle, Plus, Eye, RefreshCw, Shield, UserCheck,
  X, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'

const fmt = (v) => {
  if (v == null) return '-'
  const n = Number(v)
  return Number.isNaN(n) ? String(v) : `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}
const fmtDate = (v) => {
  if (!v) return '-'
  const d = new Date(String(v).includes('T') ? v : v + 'T00:00')
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}
const STATUS_CHIP = {
  scheduled:     'bg-slate-100 text-slate-700',
  boarding:      'bg-blue-100 text-blue-700',
  departed:      'bg-amber-100 text-amber-700',
  'in-progress': 'bg-amber-100 text-amber-700',
  completed:     'bg-emerald-100 text-emerald-700',
  cancelled:     'bg-red-100 text-red-700',
}

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'drivers',    label: 'Drivers',    icon: Users },
  { id: 'conductors', label: 'Conductors', icon: UserCheck },
  { id: 'fleets',     label: 'Fleets',     icon: Bus },
  { id: 'routes',     label: 'Routes',     icon: MapPin },
  { id: 'trips',      label: 'Trips',      icon: Clock },
  { id: 'reports',    label: 'Reports',    icon: PieChart },
  { id: 'account',    label: 'Account',    icon: Settings },
]

function Sidebar({ activeTab, onTabChange, onLogout }) {
  return (
    <aside className="flex w-[220px] shrink-0 flex-col bg-[#0D1B2A] px-4 py-8">
      <div className="mb-10 flex items-center gap-2 px-2">
        <Bus className="h-7 w-7 text-teal-500" strokeWidth={1.5} />
        <span className="text-base font-bold text-white">SmartTransit</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => onTabChange(id)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              activeTab === id ? 'bg-teal-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}>
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </nav>
      <button type="button" onClick={onLogout}
        className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-900/20 transition-colors">
        <LogOut className="h-4 w-4 shrink-0" />Logout
      </button>
    </aside>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, required, placeholder, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      {children ?? (
        <input type={type} value={value} onChange={onChange} required={required} placeholder={placeholder}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500" />
      )}
    </div>
  )
}

function DashboardTab({ trips, drivers, conductors, fleets }) {
  const total     = trips.length
  const active    = trips.filter(t => ['departed','in-progress','boarding'].includes(t.status)).length
  const completed = trips.filter(t => t.status === 'completed').length
  const revenue   = trips.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.total_revenue ?? 0), 0)
  const recent    = [...trips].sort((a,b) => new Date(b.trip_date) - new Date(a.trip_date)).slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Trips',   value: total,       color: 'text-slate-900' },
          { label: 'Active Now',    value: active,      color: 'text-blue-600' },
          { label: 'Completed',     value: completed,   color: 'text-emerald-600' },
          { label: 'Revenue (all)', value: fmt(revenue),color: 'text-teal-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[['Drivers', drivers.length],['Conductors', conductors.length],['Fleets', fleets.length]].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Recent Trips</h2>
        {recent.length === 0 ? <p className="text-sm text-slate-400">No trips found.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Trip ID','Date','Route','Fleet','Status','Revenue'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map(t => (
                  <tr key={t.trip_id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-xs text-slate-700">#{t.trip_id}</td>
                    <td className="px-4 py-2 text-slate-600">{fmtDate(t.trip_date)}</td>
                    <td className="px-4 py-2 text-slate-700">{t.fleet_route?.route?.route_name || '-'}</td>
                    <td className="px-4 py-2 text-slate-700">{t.fleet_route?.fleet?.plate_number || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CHIP[t.status] ?? 'bg-slate-100 text-slate-600'}`}>{t.status}</span>
                    </td>
                    <td className="px-4 py-2 text-slate-700">{fmt(t.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StaffListTab({ role, items, onRefresh, onCreateAccount }) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('')
    try {
      await onCreateAccount({ ...form, role })
      setMsg(`${role.charAt(0).toUpperCase() + role.slice(1)} account created.`)
      setForm({ username: '', email: '', password: '' }); setShowModal(false); onRefresh()
    } catch (err) { setMsg(err?.message || 'Failed to create account.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 capitalize">{role}s</h2>
        <div className="flex gap-2">
          <button type="button" onClick={onRefresh} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button type="button" onClick={() => { setShowModal(true); setMsg('') }} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            <Plus className="h-4 w-4" /> Add {role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        </div>
      </div>
      {msg && <p className="rounded-lg bg-teal-50 border border-teal-200 px-4 py-2 text-sm text-teal-800">{msg}</p>}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['Username','Email','Role','Joined'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0
              ? <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">No {role}s found.</td></tr>
              : items.map(d => (
                <tr key={d.user_id ?? d.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{d.username}</td>
                  <td className="px-5 py-3 text-slate-600">{d.email}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 capitalize">{d.role}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{fmtDate(d.created_at)}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      {showModal && (
        <Modal title={`Create ${role.charAt(0).toUpperCase() + role.slice(1)} Account`} onClose={() => setShowModal(false)}>
          <form className="space-y-4" onSubmit={handleCreate}>
            <Field label="Username" value={form.username} onChange={e => setForm(p => ({...p, username: e.target.value}))} required placeholder="juan_dela_cruz" />
            <Field label="Email" type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} required placeholder="juan@example.com" />
            <Field label="Password" type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} required placeholder="Minimum 8 characters" />
            {msg && <p className="text-sm text-red-600">{msg}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}Create Account
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function FleetsTab({ fleets, onRefresh }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Fleet Management</h2>
        <button type="button" onClick={onRefresh} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Units', value: fleets.length },
          { label: 'Fleet Types', value: [...new Set(fleets.map(f => f.fleet_type).filter(Boolean))].join(', ') || '-' },
          { label: 'Active', value: fleets.filter(f => f.status === 'active').length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['Fleet ID','Plate No.','Type','Capacity','Status'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fleets.length === 0
              ? <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">No fleets found.</td></tr>
              : fleets.map(f => (
                <tr key={f.fleet_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">#{f.fleet_id}</td>
                  <td className="px-5 py-3 font-semibold text-slate-900">{f.plate_number}</td>
                  <td className="px-5 py-3 text-slate-600 capitalize">{f.fleet_type || '-'}</td>
                  <td className="px-5 py-3 text-slate-600">{f.capacity ?? '-'}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${f.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {f.status || 'unknown'}
                    </span>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RoutesTab({ routes, onRefresh }) {
  const [expanded, setExpanded] = useState(null)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Routes</h2>
        <button type="button" onClick={onRefresh} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['ID','Name','Origin','Destination','Stops',''].map((h,i) => (
                <th key={i} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {routes.length === 0
              ? <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">No routes found.</td></tr>
              : routes.map(r => (
                <>
                  <tr key={r.route_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">#{r.route_id}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">{r.route_name}</td>
                    <td className="px-5 py-3 text-slate-600">{r.origin || '-'}</td>
                    <td className="px-5 py-3 text-slate-600">{r.destination || '-'}</td>
                    <td className="px-5 py-3 text-slate-600">{r.route_stops?.length ?? 0}</td>
                    <td className="px-5 py-3">
                      <button type="button" onClick={() => setExpanded(expanded === r.route_id ? null : r.route_id)} className="text-teal-600 hover:text-teal-700">
                        {expanded === r.route_id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                  {expanded === r.route_id && r.route_stops?.length > 0 && (
                    <tr key={`${r.route_id}-stops`} className="bg-slate-50">
                      <td colSpan={6} className="px-8 py-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Stops</p>
                        <ol className="flex flex-wrap gap-2">
                          {r.route_stops.sort((a,b) => a.stop_order - b.stop_order).map((rs, idx) => (
                            <li key={rs.route_stop_id ?? idx} className="rounded-full bg-white border border-slate-200 px-3 py-1 text-xs text-slate-700">
                              {idx+1}. {rs.stop?.stop_name || `Stop #${rs.stop_id}`}
                            </li>
                          ))}
                        </ol>
                      </td>
                    </tr>
                  )}
                </>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TripsTab({ trips, drivers, conductors, onRefresh }) {
  const [showModal, setShowModal]   = useState(false)
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [assignModal, setAssignModal]   = useState(null)
  const [confirmComplete, setConfirmComplete] = useState(null) // trip object pending confirmation
  const [form, setForm]             = useState({ fleet_route_id: '', trip_date: '', notes: '' })
  const [assignId, setAssignId]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [actionInFlight, setActionInFlight] = useState(null) // tripId currently being actioned
  const [msg, setMsg]               = useState('')
  const [fleetRoutes, setFleetRoutes] = useState([])

  useEffect(() => {
    StaffService.getOperatorFleetRoutes().then(r => setFleetRoutes(r?.data ?? [])).catch(() => {})
  }, [])

  const handleSchedule = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('')
    try {
      await StaffService.scheduleTrip(form)
      setMsg('Trip scheduled.'); setForm({ fleet_route_id: '', trip_date: '', notes: '' }); setShowModal(false); onRefresh()
    } catch (err) { setMsg(err?.message || 'Failed.') }
    finally { setSaving(false) }
  }

  const handleAssign = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('')
    try {
      if (assignModal.type === 'driver') await StaffService.assignDriver(assignModal.trip.trip_id, Number(assignId))
      else await StaffService.assignConductor(assignModal.trip.trip_id, Number(assignId))
      setMsg('Assigned.'); setAssignModal(null); onRefresh()
    } catch (err) { setMsg(err?.message || 'Failed.') }
    finally { setSaving(false) }
  }

  const handleAction = async (tripId, action) => {
    if (action === 'complete') {
      const trip = trips.find(t => t.trip_id === tripId)
      setConfirmComplete(trip)
      return
    }
    setActionInFlight(tripId)
    try {
      if (action === 'boarding') await StaffService.startBoarding(tripId)
      else if (action === 'depart') await StaffService.operatorDepartTrip(tripId)
      onRefresh()
    } catch (err) { setMsg(err?.message || 'Action failed.') }
    finally { setActionInFlight(null) }
  }

  const handleConfirmedComplete = async () => {
    const tripId = confirmComplete.trip_id
    setConfirmComplete(null)
    setActionInFlight(tripId)
    try {
      await StaffService.operatorCompleteTrip(tripId)
      onRefresh()
    } catch (err) { setMsg(err?.message || 'Failed to complete trip.') }
    finally { setActionInFlight(null) }
  }

  const sorted = [...trips].sort((a,b) => new Date(b.trip_date) - new Date(a.trip_date))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Trips</h2>
        <div className="flex gap-2">
          <button type="button" onClick={onRefresh} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button type="button" onClick={() => { setShowModal(true); setMsg('') }} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            <Plus className="h-4 w-4" /> Schedule Trip
          </button>
        </div>
      </div>
      {msg && <p className="rounded-lg bg-teal-50 border border-teal-200 px-4 py-2 text-sm text-teal-800">{msg}</p>}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                {['ID','Date','Route','Fleet','Driver','Conductor','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0
                ? <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-slate-400">No trips found.</td></tr>
                : sorted.map(t => {
                  const driverName = t.driver?.username || t.driver?.email || null
                  const conductorName = t.conductor?.username || t.conductor?.email || null
                  return (
                    <tr key={t.trip_id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">#{t.trip_id}</td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{fmtDate(t.trip_date)}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-[120px] truncate">{t.fleet_route?.route?.route_name || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{t.fleet_route?.fleet?.plate_number || '-'}</td>
                      <td className="px-4 py-3">
                        {driverName ? <span className="text-slate-700">{driverName}</span>
                          : <button type="button" onClick={() => { setAssignModal({ trip: t, type: 'driver' }); setAssignId(''); setMsg('') }} className="text-xs text-teal-600 hover:underline">Assign</button>}
                      </td>
                      <td className="px-4 py-3">
                        {conductorName ? <span className="text-slate-700">{conductorName}</span>
                          : <button type="button" onClick={() => { setAssignModal({ trip: t, type: 'conductor' }); setAssignId(''); setMsg('') }} className="text-xs text-teal-600 hover:underline">Assign</button>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_CHIP[t.status] ?? 'bg-slate-100 text-slate-600'}`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {t.status === 'scheduled'    && <button type="button" onClick={() => handleAction(t.trip_id,'boarding')} disabled={actionInFlight === t.trip_id} className="rounded px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50">{actionInFlight === t.trip_id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Board'}</button>}
                          {t.status === 'boarding'     && <button type="button" onClick={() => handleAction(t.trip_id,'depart')} disabled={actionInFlight === t.trip_id} className="rounded px-2 py-1 text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50">{actionInFlight === t.trip_id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Depart'}</button>}
                          {['departed','in-progress'].includes(t.status) && <button type="button" onClick={() => handleAction(t.trip_id,'complete')} disabled={actionInFlight === t.trip_id} className="rounded px-2 py-1 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50">Complete</button>}
                          <button type="button" onClick={() => setSelectedTrip(t)} className="rounded px-2 py-1 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200"><Eye className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal title="Schedule Trip" onClose={() => setShowModal(false)}>
          <form className="space-y-4" onSubmit={handleSchedule}>
            <Field label="Fleet Route" required>
              <select value={form.fleet_route_id} onChange={e => setForm(p => ({...p, fleet_route_id: e.target.value}))} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Select a fleet route…</option>
                {fleetRoutes.map(fr => (
                  <option key={fr.fleet_route_id} value={fr.fleet_route_id}>{fr.fleet?.plate_number} — {fr.route?.route_name}</option>
                ))}
              </select>
            </Field>
            <Field label="Trip Date" type="date" value={form.trip_date} onChange={e => setForm(p => ({...p, trip_date: e.target.value}))} required />
            <Field label="Notes (optional)" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Any notes…" />
            {msg && <p className="text-sm text-red-600">{msg}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}Schedule
              </button>
            </div>
          </form>
        </Modal>
      )}

      {assignModal && (
        <Modal title={`Assign ${assignModal.type} to Trip #${assignModal.trip.trip_id}`} onClose={() => setAssignModal(null)}>
          <form className="space-y-4" onSubmit={handleAssign}>
            <Field label={`Select ${assignModal.type}`} required>
              <select value={assignId} onChange={e => setAssignId(e.target.value)} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Choose…</option>
                {(assignModal.type === 'driver' ? drivers : conductors).map(p => (
                  <option key={p.user_id} value={p.user_id}>{p.username} ({p.email})</option>
                ))}
              </select>
            </Field>
            {msg && <p className="text-sm text-red-600">{msg}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAssignModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}Assign
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmComplete && (
        <Modal title="Complete Trip?" onClose={() => setConfirmComplete(null)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">This will finalize the trip and record all earnings. <strong>This cannot be undone.</strong></p>
            <dl className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-sm">
              <div><dt className="text-xs text-slate-400">Trip ID</dt><dd className="font-semibold text-slate-900">#{confirmComplete.trip_id}</dd></div>
              <div><dt className="text-xs text-slate-400">Route</dt><dd className="font-semibold text-slate-900">{confirmComplete.fleet_route?.route?.route_name || '-'}</dd></div>
              <div><dt className="text-xs text-slate-400">Fleet</dt><dd className="font-semibold text-slate-900">{confirmComplete.fleet_route?.fleet?.plate_number || '-'}</dd></div>
              <div><dt className="text-xs text-slate-400">Date</dt><dd className="font-semibold text-slate-900">{fmtDate(confirmComplete.trip_date)}</dd></div>
            </dl>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmComplete(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={handleConfirmedComplete} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Yes, Complete Trip</button>
            </div>
          </div>
        </Modal>
      )}

      {selectedTrip && (
        <Modal title={`Trip #${selectedTrip.trip_id} Details`} onClose={() => setSelectedTrip(null)}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[['Date', fmtDate(selectedTrip.trip_date)],['Status', selectedTrip.status],['Route', selectedTrip.fleet_route?.route?.route_name],['Fleet', selectedTrip.fleet_route?.fleet?.plate_number],['Driver', selectedTrip.driver?.username || 'Unassigned'],['Conductor', selectedTrip.conductor?.username || 'Unassigned'],['Revenue', fmt(selectedTrip.total_revenue)]].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{value || '-'}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
    </div>
  )
}

function ReportsTab({ fleets }) {
  const [selectedFleet, setSelectedFleet] = useState('')
  const [reportType, setReportType]       = useState('financial')
  const [report, setReport]               = useState(null)
  const [loading, setLoading]             = useState(false)
  const [msg, setMsg]                     = useState('')

  const fetchReport = async () => {
    if (!selectedFleet) { setMsg('Please select a fleet first.'); return }
    setLoading(true); setMsg(''); setReport(null)
    try {
      let res
      if (reportType === 'financial')  res = await StaffService.getFinancialReport(selectedFleet)
      else if (reportType === 'revenue')   res = await StaffService.getRevenueByRoute(selectedFleet)
      else if (reportType === 'adherence') res = await StaffService.getRouteAdherence(selectedFleet)
      else if (reportType === 'occupancy') res = await StaffService.getOccupancyTrends(selectedFleet)
      else if (reportType === 'daily')     res = await StaffService.getDailySummary(selectedFleet)
      else if (reportType === 'channels')  res = await StaffService.getPaymentChannels(selectedFleet)
      setReport(res?.data ?? res)
    } catch (err) { setMsg(err?.message || 'Failed to load report.') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Fleet Reports</h2>
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-slate-600">Fleet</label>
          <select value={selectedFleet} onChange={e => setSelectedFleet(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">Select fleet…</option>
            {fleets.map(f => <option key={f.fleet_id} value={f.fleet_id}>{f.plate_number}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-slate-600">Report Type</label>
          <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500">
            <option value="financial">Financial Audit</option>
            <option value="revenue">Revenue by Route</option>
            <option value="adherence">Route Adherence</option>
            <option value="occupancy">Occupancy Trends</option>
            <option value="daily">Daily Summary</option>
            <option value="channels">Payment Channels</option>
          </select>
        </div>
        <div className="flex items-end">
          <button type="button" onClick={fetchReport} disabled={loading} className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            Run Report
          </button>
        </div>
      </div>
      {msg && <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{msg}</p>}
      {report && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-700">{JSON.stringify(report, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

function AccountTab({ profile, twoFactorEnabled, onToggle2FA, saving2fa, msg2fa }) {
  const user  = profile?.user ?? {}
  const staff = profile ?? {}
  return (
    <div className="max-w-xl space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Account</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-xl font-bold text-white">
            {(user.username || user.email || 'O')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{user.username || 'Operator'}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>
        <dl className="space-y-2 text-sm">
          {[['Role', user.role],['Joined', fmtDate(user.created_at)],['Company ID', staff.company_user_id]].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between border-t border-slate-100 pt-2">
              <dt className="text-slate-500">{label}</dt>
              <dd className="font-medium text-slate-900">{value || '-'}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
          <div className="flex-1">
            <p className="font-semibold text-slate-900">Two-Factor Authentication</p>
            <p className="mt-0.5 text-sm text-slate-500">Operator accounts always require OTP on login. Toggle to enforce 2FA for all sessions.</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" className="sr-only peer" checked={twoFactorEnabled} onChange={onToggle2FA} disabled={saving2fa} />
            <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-teal-500 peer-focus:ring-2 peer-focus:ring-teal-400 transition-colors after:absolute after:top-0.5 after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>
        {msg2fa && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg2fa.toLowerCase().includes('fail') ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-700'}`}>{msg2fa}</p>
        )}
      </div>
    </div>
  )
}

export default function OperatorDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab]   = useState('dashboard')
  const [loading, setLoading]       = useState(true)
  const [profile, setProfile]       = useState(null)
  const [trips, setTrips]           = useState([])
  const [drivers, setDrivers]       = useState([])
  const [conductors, setConductors] = useState([])
  const [fleets, setFleets]         = useState([])
  const [routes, setRoutes]         = useState([])
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [saving2fa, setSaving2fa]               = useState(false)
  const [msg2fa, setMsg2fa]                     = useState('')

  const load = useCallback(async () => {
    try {
      const [profRes, tripsRes, driversRes, conductorsRes, fleetsRes, routesRes] = await Promise.allSettled([
        StaffService.getProfile('operator'),
        StaffService.getOperatorTrips(),
        StaffService.getOperatorDrivers(),
        StaffService.getOperatorConductors(),
        StaffService.getOperatorFleets(),
        StaffService.getOperatorRoutes(),
      ])
      if (profRes.status === 'fulfilled') {
        const p = profRes.value?.data ?? profRes.value
        setProfile(p)
        if (typeof p?.user?.two_factor_enabled === 'boolean') setTwoFactorEnabled(p.user.two_factor_enabled)
      } else { navigate('/employee/login'); return }
      if (tripsRes.status === 'fulfilled')      setTrips(Array.isArray(tripsRes.value?.data) ? tripsRes.value.data : [])
      if (driversRes.status === 'fulfilled')    setDrivers(Array.isArray(driversRes.value?.data) ? driversRes.value.data : [])
      if (conductorsRes.status === 'fulfilled') setConductors(Array.isArray(conductorsRes.value?.data) ? conductorsRes.value.data : [])
      if (fleetsRes.status === 'fulfilled')     setFleets(Array.isArray(fleetsRes.value?.data) ? fleetsRes.value.data : [])
      if (routesRes.status === 'fulfilled')     setRoutes(Array.isArray(routesRes.value?.data) ? routesRes.value.data : [])
    } finally { setLoading(false) }
  }, [navigate])

  useEffect(() => { load() }, [load])

  const handleToggle2FA = async (e) => {
    const enabled = e.target.checked
    setTwoFactorEnabled(enabled); setSaving2fa(true); setMsg2fa('')
    try {
      await StaffService.setTwoFactorPreference(enabled)
      setMsg2fa(enabled ? '2FA enabled for your account.' : '2FA disabled for your account.')
    } catch (err) { setTwoFactorEnabled(!enabled); setMsg2fa(err?.message || 'Failed to update 2FA preference.') }
    finally { setSaving2fa(false) }
  }

  const handleLogout = async () => {
    try { await StaffService.logout() } catch {}
    navigate('/employee/login')
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading dashboard…</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto p-6">
        {activeTab === 'dashboard'  && <DashboardTab trips={trips} drivers={drivers} conductors={conductors} fleets={fleets} />}
        {activeTab === 'drivers'    && <StaffListTab role="driver" items={drivers} onRefresh={load} onCreateAccount={d => StaffService.createEmployeeAccount(d)} />}
        {activeTab === 'conductors' && <StaffListTab role="conductor" items={conductors} onRefresh={load} onCreateAccount={d => StaffService.createEmployeeAccount(d)} />}
        {activeTab === 'fleets'     && <FleetsTab fleets={fleets} onRefresh={load} />}
        {activeTab === 'routes'     && <RoutesTab routes={routes} onRefresh={load} />}
        {activeTab === 'trips'      && <TripsTab trips={trips} drivers={drivers} conductors={conductors} onRefresh={load} />}
        {activeTab === 'reports'    && <ReportsTab fleets={fleets} />}
        {activeTab === 'account'    && <AccountTab profile={profile} twoFactorEnabled={twoFactorEnabled} onToggle2FA={handleToggle2FA} saving2fa={saving2fa} msg2fa={msg2fa} />}
      </main>
    </div>
  )
}

