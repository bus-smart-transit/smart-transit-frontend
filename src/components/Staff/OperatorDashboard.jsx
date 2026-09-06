import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import StaffService from '../../api/StaffService/StaffService'
import { buildOperatorForecast } from './routeForecast'
import { loadMapLib } from '../Map/mapDependencies'
import {
  LayoutDashboard, Bus, MapPin, Clock, PieChart, Users, Settings,
  LogOut, Plus, Eye, RefreshCw, Shield, Download,
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
const riskSeverity = (risk) => {
  const value = Number(risk || 0)
  if (value >= 75) return { label: 'Severe', tone: 'bg-red-100 text-red-700', bar: 'bg-red-500' }
  if (value >= 50) return { label: 'High', tone: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500' }
  if (value >= 30) return { label: 'Moderate', tone: 'bg-yellow-100 text-yellow-700', bar: 'bg-yellow-500' }
  return { label: 'Low', tone: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' }
}
const timeSlotWindow = {
  morning: '6:00 AM - 11:59 AM',
  afternoon: '12:00 PM - 5:59 PM',
  evening: '6:00 PM - 11:59 PM',
}
const STATUS_CHIP = {
  scheduled:     'bg-slate-100 text-slate-700',
  delayed:       'bg-rose-100 text-rose-700',
  boarding:      'bg-blue-100 text-blue-700',
  departed:      'bg-amber-100 text-amber-700',
  'in-progress': 'bg-amber-100 text-amber-700',
  completed:     'bg-emerald-100 text-emerald-700',
  cancelled:     'bg-red-100 text-red-700',
}

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'staffs',     label: 'Staffs',     icon: Users },
  { id: 'fleets',     label: 'Fleets',     icon: Bus },
  { id: 'routes',     label: 'Routes',     icon: MapPin },
  { id: 'trips',      label: 'Trips',      icon: Clock },
  { id: 'reports',    label: 'Reports',    icon: PieChart },
  { id: 'account',    label: 'Account',    icon: Settings },
]
const DISPATCH_STORAGE_KEY = 'smarttransit.operator.dispatch.decisions'

const getStaffFullName = (row) => row?.name || row?.user?.name || row?.user?.username || row?.username || '-'
const getStaffUsername = (row) => row?.user?.username || row?.username || row?.name || '-'
const getStaffEmail = (row) => row?.user?.email || row?.email || '-'
const getStaffRole = (row) => row?.user?.role || row?.role || '-'
const getStaffJoinedAt = (row) => row?.user?.created_at || row?.created_at || null
const getStaffCompanyUserId = (row) => row?.company_user_id || row?.user_id || row?.id

function Sidebar({ activeTab, onTabChange, onLogout }) {
  return (
    <aside className="flex w-56 shrink-0 flex-col bg-[#0A1324] px-3 py-7">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-[#111C33]">
          <Bus className="h-6 w-6 text-slate-100" strokeWidth={1.8} />
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1.5">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => onTabChange(id)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === id ? 'bg-slate-700/60 text-white' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
            }`}>
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </nav>
      <button type="button" onClick={onLogout}
        className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/70 transition-colors">
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
  const [selectedDispatch, setSelectedDispatch] = useState(() => {
    if (typeof window === 'undefined' || !window.localStorage) return {}

    try {
      const raw = window.localStorage.getItem(DISPATCH_STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })
  const [dispatching, setDispatching] = useState({})

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) return

    try {
      window.localStorage.setItem(DISPATCH_STORAGE_KEY, JSON.stringify(selectedDispatch))
    } catch {
      // Ignore storage issues in restricted environments.
    }
  }, [selectedDispatch])

  const handleDispatchDecision = useCallback((routeName, decision, meta = {}) => {
    const matchedTrip = trips.find(trip => (trip.fleet_route?.route?.route_name || 'Unassigned Route') === routeName)
    const tripId = matchedTrip?.trip_id

    setSelectedDispatch(prev => ({ ...prev, [routeName]: decision }))

    if (!tripId) return

    setDispatching(prev => ({ ...prev, [routeName]: true }))

    const payload = {
      decision,
      route: meta.alternativeRoute || routeName,
      reason: meta.reason || meta.recommendation || `${decision === 'accept' ? 'Operator accepted the reroute recommendation.' : 'Operator kept the current route.'}`,
    }

    StaffService.saveDispatchDecision(tripId, payload)
      .catch(() => {
        setSelectedDispatch(prev => ({ ...prev, [routeName]: decision }))
      })
      .finally(() => {
        setDispatching(prev => ({ ...prev, [routeName]: false }))
      })
  }, [trips])

  const total     = trips.length
  const active    = trips.filter(t => ['departed','in-progress','boarding'].includes(t.status)).length
  const completed = trips.filter(t => t.status === 'completed').length
  const revenue   = trips.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.total_revenue ?? 0), 0)
  const recent    = [...trips].sort((a,b) => new Date(b.trip_date) - new Date(a.trip_date)).slice(0, 5)
  const activeTrips = trips.filter(t => ['departed','in-progress','boarding'].includes(t.status))
  const needsAttention = activeTrips.filter(t => !t.driver || !t.conductor || t.status === 'boarding').length
  const routeHealth = [
    { label: 'Active Trips', value: activeTrips.length, tone: 'bg-blue-100 text-blue-700' },
    { label: 'Needs Attention', value: needsAttention, tone: 'bg-amber-100 text-amber-700' },
    { label: 'Assigned Teams', value: activeTrips.filter(t => t.driver && t.conductor).length, tone: 'bg-emerald-100 text-emerald-700' },
    { label: 'Trips Ready', value: activeTrips.filter(t => t.status === 'boarding').length, tone: 'bg-violet-100 text-violet-700' },
  ]
  const operationStatus = needsAttention === 0 ? 'Operating normally' : 'Action required'
  const operationTone = needsAttention === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
  const liveRefreshNotice = needsAttention === 0 ? 'All routes are within normal operating range.' : `${needsAttention} route item(s) need attention.`
  const forecast = buildOperatorForecast(trips)
  const predictiveReroutes = forecast.rerouteRecommendations ?? []
  const routeComparisons = forecast.routeComparison ?? []
  const dispatchDecisionCount = Object.keys(selectedDispatch).length
  const routeDelaySummary = Object.values(activeTrips.reduce((acc, trip) => {
    const routeName = trip.fleet_route?.route?.route_name || 'Unassigned Route'
    const entry = acc[routeName] ?? {
      route: routeName,
      active: 0,
      crewReady: 0,
      atRisk: 0,
      boarding: 0,
    }
    entry.active += 1
    if (trip.driver && trip.conductor) entry.crewReady += 1
    if (!trip.driver || !trip.conductor || trip.status === 'boarding') entry.atRisk += 1
    if (trip.status === 'boarding') entry.boarding += 1
    acc[routeName] = entry
    return acc
  }, {})).sort((a, b) => b.atRisk - a.atRisk || b.active - a.active)
  const routeRecommendations = routeDelaySummary.map(row => {
    if (row.atRisk === 0) {
      return {
        route: row.route,
        priority: 'low',
        title: 'Stable route',
        text: 'No immediate action required. Continue monitoring.',
      }
    }
    if (row.boarding > 0) {
      return {
        route: row.route,
        priority: 'high',
        title: 'Boarding pressure',
        text: 'Passenger volume is elevated. Rebalance boarding flow and dispatch on time.',
      }
    }
    if (row.crewReady === 0) {
      return {
        route: row.route,
        priority: 'high',
        title: 'Crew coverage issue',
        text: 'No fully assigned crew on this route. Assign a driver and conductor immediately.',
      }
    }
    return {
      route: row.route,
      priority: 'medium',
      title: 'Traffic watch',
      text: 'Route is active but exposed to delay. Monitor traffic and hold readiness for dispatch updates.',
    }
  })
  const fleetResponseView = routeDelaySummary.map(row => {
    const fleetHint = activeTrips
      .filter(trip => (trip.fleet_route?.route?.route_name || 'Unassigned Route') === row.route)
      .map(trip => trip.fleet_route?.fleet?.plate_number || 'Fleet pending')
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, 2)
      .join(', ') || 'No fleet assigned'
    const action = row.crewReady === 0
      ? 'Dispatch staff assignment'
      : row.boarding > 0
        ? 'Rebalance boarding and hold dispatch'
        : row.atRisk > 0
          ? 'Monitor and update ETAs'
          : 'Standard dispatch'
    return {
      route: row.route,
      fleet: fleetHint,
      risk: row.atRisk,
      crewReady: row.crewReady,
      action,
      priority: row.atRisk === 0 ? 'low' : row.boarding > 0 || row.crewReady === 0 ? 'high' : 'medium',
    }
  })
  const alerts = activeTrips.flatMap(t => {
    const items = []
    if (!t.driver || !t.conductor) {
      items.push({
        key: `${t.trip_id}-crew`,
        type: 'Crew assignment',
        severity: 'warning',
        title: `Trip #${t.trip_id} is missing a ${!t.driver && !t.conductor ? 'driver and conductor' : !t.driver ? 'driver' : 'conductor'}`,
        detail: `${t.fleet_route?.route?.route_name || 'Route'} • ${t.fleet_route?.fleet?.plate_number || 'Fleet pending'}`,
        action: 'Assign staff before departure.'
      })
    }
    if (t.status === 'boarding') {
      items.push({
        key: `${t.trip_id}-boarding`,
        type: 'Boarding',
        severity: 'info',
        title: `Trip #${t.trip_id} is boarding`,
        detail: `${t.fleet_route?.route?.route_name || 'Route'} • ${t.fleet_route?.fleet?.plate_number || 'Fleet pending'}`,
        action: 'Monitor passenger flow and dispatch on time.'
      })
    }
    if (t.status === 'departed' && t.driver && t.conductor) {
      items.push({
        key: `${t.trip_id}-enroute`,
        type: 'In transit',
        severity: 'success',
        title: `Trip #${t.trip_id} is underway`,
        detail: `${t.fleet_route?.route?.route_name || 'Route'} • ${t.fleet_route?.fleet?.plate_number || 'Fleet pending'}`,
        action: 'Track progress and readiness for next stop.'
      })
    }
    return items
  })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-teal-100 bg-linear-to-r from-teal-600 via-teal-500 to-cyan-500 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-100">Operations overview</p>
            <h1 className="mt-2 text-2xl font-bold">Fleet command center</h1>
          </div>
          <div className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${operationTone}`}>
            {operationStatus}
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-teal-50">
          Live update: {liveRefreshNotice}
        </div>
      </div>
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Route Health Summary</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Live Ops</span>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {routeHealth.map(item => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-2xl font-bold text-slate-900">{item.value}</span>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.tone}`}>{item.value > 0 ? 'Monitor' : 'Stable'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Dispatch Decision Board</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Live</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Reroute alerts</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{predictiveReroutes.length}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Decision count</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{dispatchDecisionCount}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Status</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{dispatchDecisionCount > 0 ? 'Reviewing' : 'Awaiting route action'}</p>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Historical Forecast</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Trend</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Avg. revenue</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{fmt(forecast.avgRevenue)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Traffic risk severity</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{Math.round(forecast.forecastRisk)}%</p>
            <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${riskSeverity(forecast.forecastRisk).tone}`}>{riskSeverity(forecast.forecastRisk).label}</span>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Most at-risk route</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{forecast.highestRisk?.route || 'No risk route detected'}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {Object.entries(forecast.timeSlotForecast ?? {}).map(([slot, value]) => (
            <div key={slot} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{value.label} ({timeSlotWindow[slot] || 'Peak window'})</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{value.risk}%</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full ${riskSeverity(value.risk).bar}`} style={{ width: `${Math.min(100, Math.max(0, Number(value.risk || 0)))}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-600">{value.note}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Route Delay Overview</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">By Route</span>
        </div>
        {routeDelaySummary.length === 0 ? (
          <p className="text-sm text-slate-500">No active routes to review.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Route</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Trips</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Crew Ready</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Risk</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {routeDelaySummary.map(row => {
                  const status = row.atRisk > 0 ? (row.boarding > 0 ? 'Watch' : 'Needs action') : 'Stable'
                  const badge = row.atRisk > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  return (
                    <tr key={row.route} className="border-b border-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-700">{row.route}</td>
                      <td className="px-3 py-2 text-slate-600">{row.active}</td>
                      <td className="px-3 py-2 text-slate-600">{row.crewReady}</td>
                      <td className="px-3 py-2 text-slate-600">{row.atRisk}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${badge}`}>{status}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Recommended Actions</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Suggested</span>
        </div>
        {routeRecommendations.length === 0 ? (
          <p className="text-sm text-slate-500">No route recommendations available.</p>
        ) : (
          <div className="space-y-3">
            {routeRecommendations.map(rec => (
              <div key={rec.route} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <span className={`mt-0.5 inline-flex h-2.5 w-2.5 rounded-full ${rec.priority === 'high' ? 'bg-red-500' : rec.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{rec.title}</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">{rec.route}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{rec.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Predictive Reroute Plan</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Forecast</span>
        </div>
        {predictiveReroutes.length === 0 ? (
          <p className="text-sm text-slate-500">No reroute suggestions available.</p>
        ) : (
          <div className="space-y-3">
            {predictiveReroutes.map(rec => (
              <div key={rec.route} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{rec.route}</p>
                    <p className="text-xs text-slate-500">Peak risk window: {rec.peakSlot}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${rec.priority === 'high' ? 'bg-red-100 text-red-700' : rec.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {rec.priority}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <div className="rounded-lg bg-white px-3 py-2"><span className="block text-slate-400">Risk score</span><strong className="text-slate-900">{rec.riskScore}%</strong></div>
                  <div className="rounded-lg bg-white px-3 py-2"><span className="block text-slate-400">Alt route</span><strong className="text-slate-900">{rec.alternativeRoute}</strong></div>
                </div>
                <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <div className="rounded-lg bg-white px-3 py-2"><span className="block text-slate-400">Crew state</span><strong className="text-slate-900">{rec.crewState}</strong></div>
                  <div className="rounded-lg bg-white px-3 py-2"><span className="block text-slate-400">Emergency state</span><strong className="text-slate-900">{rec.emergencyState}</strong></div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{rec.recommendedAction}</p>
                <p className="mt-2 text-xs text-slate-500">{rec.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={!!dispatching[rec.route]} onClick={() => handleDispatchDecision(rec.route, 'accept', {
                    alternativeRoute: rec.alternativeRoute,
                    recommendation: rec.recommendedAction,
                    reason: rec.reason,
                  })} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
                    {dispatching[rec.route] ? 'Saving...' : 'Accept reroute'}
                  </button>
                  <button type="button" disabled={!!dispatching[rec.route]} onClick={() => handleDispatchDecision(rec.route, 'keep', {
                    alternativeRoute: rec.alternativeRoute,
                    recommendation: rec.recommendedAction,
                    reason: rec.reason,
                  })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">
                    Keep current route
                  </button>
                </div>
                {selectedDispatch[rec.route] && (
                  <p className="mt-2 text-xs text-slate-600">Dispatch status: {selectedDispatch[rec.route] === 'accept' ? rec.dispatchAction : 'Current route retained.'}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Assigned Route vs. Alternative</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Comparison</span>
        </div>
        {routeComparisons.length === 0 ? (
          <p className="text-sm text-slate-500">No route comparison data is available.</p>
        ) : (
          <div className="space-y-3">
            {routeComparisons.map(item => (
              <div key={item.route} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.route}</p>
                    <p className="text-xs text-slate-500">{item.trafficLevel}</p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    Save {item.timeSavedMinutes} min
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                  <div className="rounded-lg bg-white px-3 py-2"><span className="block text-slate-400">Current</span><strong className="text-slate-900">{item.currentEtaMinutes} min</strong></div>
                  <div className="rounded-lg bg-white px-3 py-2"><span className="block text-slate-400">Alternative</span><strong className="text-slate-900">{item.alternateEtaMinutes} min</strong></div>
                  <div className="rounded-lg bg-white px-3 py-2"><span className="block text-slate-400">Route</span><strong className="text-slate-900">{item.alternativeRoute}</strong></div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{item.recommendation}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={!!dispatching[item.route]} onClick={() => handleDispatchDecision(item.route, 'accept', {
                    alternativeRoute: item.alternativeRoute,
                    recommendation: item.recommendation,
                    reason: item.recommendation,
                  })} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">
                    {dispatching[item.route] ? 'Saving...' : 'Accept reroute'}
                  </button>
                  <button type="button" disabled={!!dispatching[item.route]} onClick={() => handleDispatchDecision(item.route, 'keep', {
                    alternativeRoute: item.alternativeRoute,
                    recommendation: item.recommendation,
                    reason: item.recommendation,
                  })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">
                    Keep current route
                  </button>
                </div>
                {selectedDispatch[item.route] && (
                  <p className="mt-2 text-xs text-slate-600">Dispatch status: {selectedDispatch[item.route] === 'accept' ? item.dispatchAction : 'Current route retained.'}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Fleet Response View</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Dispatch</span>
        </div>
        {fleetResponseView.length === 0 ? (
          <p className="text-sm text-slate-500">No active fleet dispatch view available.</p>
        ) : (
          <div className="space-y-3">
            {fleetResponseView.map(row => (
              <div key={row.route} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{row.route}</p>
                    <p className="text-xs text-slate-500">Fleet: {row.fleet}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${row.priority === 'high' ? 'bg-red-100 text-red-700' : row.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {row.priority}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                  <div className="rounded-lg bg-white px-3 py-2"><span className="block text-slate-400">Risk</span><strong className="text-slate-900">{row.risk}</strong></div>
                  <div className="rounded-lg bg-white px-3 py-2"><span className="block text-slate-400">Crew ready</span><strong className="text-slate-900">{row.crewReady}</strong></div>
                  <div className="rounded-lg bg-white px-3 py-2"><span className="block text-slate-400">Action</span><strong className="text-slate-900">{row.action}</strong></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Operational Alerts</h2>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">{alerts.length} Active</span>
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-500">No active route alerts. All current trips are running within normal operational status.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div key={alert.key} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <span className={`mt-0.5 inline-flex h-2.5 w-2.5 rounded-full ${alert.severity === 'warning' ? 'bg-amber-500' : alert.severity === 'info' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">{alert.type}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{alert.detail}</p>
                  <p className="mt-2 text-xs text-slate-500">{alert.action}</p>
                </div>
              </div>
            ))}
          </div>
        )}
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

function StaffDirectoryTab({ drivers, conductors, onRefresh, onCreateAccount }) {
  const [roleFilter, setRoleFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'driver' })

  const allStaff = [
    ...drivers.map((row) => ({ ...row, _resolvedRole: 'driver' })),
    ...conductors.map((row) => ({ ...row, _resolvedRole: 'conductor' })),
  ].sort((a, b) => {
    const roleCompare = String(getStaffRole(a) || a._resolvedRole).localeCompare(String(getStaffRole(b) || b._resolvedRole))
    if (roleCompare !== 0) return roleCompare
    return String(getStaffUsername(a)).localeCompare(String(getStaffUsername(b)))
  })

  const filteredStaff = roleFilter === 'all'
    ? allStaff
    : allStaff.filter((row) => String(getStaffRole(row) || row._resolvedRole).toLowerCase() === roleFilter)

  const handleCreate = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMsg('')
    try {
      await onCreateAccount(form)
      setMsg('Staff account created successfully.')
      setShowModal(false)
      setForm({ username: '', email: '', password: '', role: roleFilter === 'all' ? 'driver' : roleFilter })
      onRefresh()
    } catch (err) {
      setMsg(err?.message || 'Failed to create staff account.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-slate-900">Staff Directory</h2>
        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All roles</option>
            <option value="driver">Driver</option>
            <option value="conductor">Conductor</option>
          </select>
          <button type="button" onClick={onRefresh} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            type="button"
            onClick={() => { setShowModal(true); setMsg('') }}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" /> Add Staff
          </button>
        </div>
      </div>

      {msg && <p className="rounded-lg bg-teal-50 border border-teal-200 px-4 py-2 text-sm text-teal-800">{msg}</p>}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['Username', 'Email', 'Role', 'Joined'].map((header) => (
                <th key={header} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">No staff found for this filter.</td></tr>
            ) : (
              filteredStaff.map((row) => (
                <tr key={`${getStaffRole(row)}-${getStaffCompanyUserId(row)}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{getStaffUsername(row)}</td>
                  <td className="px-5 py-3 text-slate-600">{getStaffEmail(row)}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 capitalize">{getStaffRole(row) || row._resolvedRole}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{fmtDate(getStaffJoinedAt(row))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Create Staff Account" onClose={() => setShowModal(false)}>
          <form className="space-y-4" onSubmit={handleCreate}>
            <Field label="Role" required>
              <select
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="driver">Driver</option>
                <option value="conductor">Conductor</option>
              </select>
            </Field>
            <Field label="Username" value={form.username} onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))} required placeholder="juan_dela_cruz" />
            <Field label="Email" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} required placeholder="juan@example.com" />
            <Field label="Password" type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} required placeholder="Minimum 8 characters" />
            {msg && <p className="text-sm text-red-600">{msg}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}Create Staff
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function FleetTrackingMap({ trip, location }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const mapLibRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return
    let cancelled = false

    ;(async () => {
      try {
        const { default: maplibregl } = await loadMapLib()
        if (cancelled || !mapContainerRef.current) return

        mapLibRef.current = maplibregl
        mapRef.current = new maplibregl.Map({
          container: mapContainerRef.current,
          style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
          center: [125.6128, 7.0731],
          zoom: 11,
        })
      } catch {
        // Keep silent; fallback panel remains visible.
      }
    })()

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const maplibregl = mapLibRef.current
    if (!map || !maplibregl) return

    const routeStops = trip?.fleet_route?.route?.route_stops || trip?.fleet_route?.route?.routeStops || []
    const coords = routeStops
      .slice()
      .sort((a, b) => Number(a?.stop_order ?? 0) - Number(b?.stop_order ?? 0))
      .map((stop) => {
        const lat = Number(stop?.stop?.latitude ?? stop?.latitude)
        const lng = Number(stop?.stop?.longitude ?? stop?.longitude)
        return Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : null
      })
      .filter(Boolean)

    const lat = Number(location?.latitude)
    const lng = Number(location?.longitude)
    const hasLiveMarker = Number.isFinite(lat) && Number.isFinite(lng)
    const liveCoord = hasLiveMarker ? [lng, lat] : null

    const draw = () => {
      if (map.getLayer('operator-route-line')) map.removeLayer('operator-route-line')
      if (map.getSource('operator-route')) map.removeSource('operator-route')

      if (coords.length >= 2) {
        map.addSource('operator-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coords,
            },
          },
        })

        map.addLayer({
          id: 'operator-route-line',
          type: 'line',
          source: 'operator-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#f59e0b',
            'line-width': 5,
            'line-opacity': 0.9,
          },
        })
      }

      if (hasLiveMarker) {
        if (markerRef.current) markerRef.current.remove()
        const popupHtml = `
          <div style="font-family: sans-serif; color: #0f172a; font-size: 12px;">
            <p style="margin:0;font-weight:700;">${trip?.fleet_route?.fleet?.plate_number || 'Active Bus'}</p>
            <p style="margin:4px 0 0;">${trip?.fleet_route?.route?.route_name || 'Route pending'}</p>
            <p style="margin:4px 0 0;color:#64748b;text-transform:capitalize;">Status: ${trip?.status || 'scheduled'}</p>
          </div>
        `
        const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false }).setHTML(popupHtml)

        markerRef.current = new maplibregl.Marker({ color: '#16a34a' })
          .setLngLat(liveCoord)
          .setPopup(popup)
          .addTo(map)

        const markerEl = markerRef.current.getElement()
        markerEl.addEventListener('mouseenter', () => popup.addTo(map))
        markerEl.addEventListener('mouseleave', () => popup.remove())
        markerEl.style.cursor = 'pointer'
      }

      const boundsSeed = [...coords, ...(liveCoord ? [liveCoord] : [])]
      if (boundsSeed.length > 0) {
        const bounds = boundsSeed.reduce(
          (acc, point) => acc.extend(point),
          new maplibregl.LngLatBounds(boundsSeed[0], boundsSeed[0]),
        )
        map.fitBounds(bounds, { padding: 50, maxZoom: 14 })

        if (liveCoord) {
          map.flyTo({ center: liveCoord, zoom: Math.max(map.getZoom(), 13), duration: 700 })
        }
      }
    }

    if (map.isStyleLoaded()) draw()
    else map.once('load', draw)
  }, [trip, location])

  return <div ref={mapContainerRef} className="h-107.5 w-full" />
}

function FleetsTab({ fleets, routes, trips, onRefresh }) {
  const [focusedTripId, setFocusedTripId] = useState(null)
  const [fleetLocations, setFleetLocations] = useState([])
  const [manageMsg, setManageMsg] = useState('')
  const [manageSaving, setManageSaving] = useState(false)
  const [fleetForm, setFleetForm] = useState({ plate_number: '', seated_capacity: '', standing_capacity: '', fleet_type: 'public' })
  const [assignForm, setAssignForm] = useState({ fleet_id: '', route_id: '' })
  const [fareForm, setFareForm] = useState({ fleet_id: '', seat_type: 'seated', base_fare: '', fare_per_km: '', step_up_token: '' })
  const [fareSaving, setFareSaving] = useState(false)
  const [fareMsg, setFareMsg] = useState('')

  const refreshFleetLocations = useCallback(async () => {
    try {
      const res = await StaffService.getFleetLocations()
      setFleetLocations(Array.isArray(res?.data) ? res.data : [])
    } catch {
      setFleetLocations([])
    }
  }, [])

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      void refreshFleetLocations()
    }, 0)
    const timer = setInterval(() => {
      if (!document.hidden && navigator.onLine) {
        void refreshFleetLocations()
      }
    }, 15000)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(timer)
    }
  }, [refreshFleetLocations])

  useEffect(() => {
    if (!focusedTripId) return
    const timer = setTimeout(() => {
      void refreshFleetLocations()
    }, 0)

    return () => clearTimeout(timer)
  }, [focusedTripId, refreshFleetLocations])

  const statusToProgress = (status) => {
    const normalized = String(status || '').toLowerCase()
    if (normalized === 'completed') return 100
    if (normalized === 'in-progress' || normalized === 'departed') return 72
    if (normalized === 'boarding') return 45
    if (normalized === 'delayed') return 28
    if (normalized === 'scheduled') return 20
    return 12
  }

  const statusLabel = (status) => {
    const normalized = String(status || '').toLowerCase()
    if (normalized === 'in-progress' || normalized === 'departed' || normalized === 'boarding') return 'Ongoing'
    if (normalized === 'delayed') return 'Delayed'
    if (normalized === 'scheduled') return 'Upcoming'
    if (normalized === 'completed') return 'Completed'
    return 'Pending'
  }

  const getLocationByFleet = (fleetId) => fleetLocations.find((entry) => Number(entry?.fleet_id) === Number(fleetId)) || null

  const handleCreateFleet = async (event) => {
    event.preventDefault()
    setManageMsg('')
    setManageSaving(true)
    try {
      await StaffService.createFleet({
        plate_number: fleetForm.plate_number,
        seated_capacity: Number(fleetForm.seated_capacity),
        standing_capacity: Number(fleetForm.standing_capacity),
        fleet_type: fleetForm.fleet_type,
      })
      setFleetForm({ plate_number: '', seated_capacity: '', standing_capacity: '', fleet_type: 'public' })
      setManageMsg('Fleet created successfully.')
      onRefresh()
    } catch (err) {
      setManageMsg(err?.message || 'Failed to create fleet.')
    } finally {
      setManageSaving(false)
    }
  }

  const handleAssignRoute = async (event) => {
    event.preventDefault()
    setManageMsg('')
    setManageSaving(true)
    try {
      await StaffService.assignRouteToFleet(Number(assignForm.fleet_id), { route_id: Number(assignForm.route_id) })
      setAssignForm({ fleet_id: '', route_id: '' })
      setManageMsg('Route assigned to fleet successfully.')
      onRefresh()
    } catch (err) {
      setManageMsg(err?.message || 'Failed to assign route to fleet.')
    } finally {
      setManageSaving(false)
    }
  }

  const handleApplyFareRule = async (event) => {
    event.preventDefault()
    setFareMsg('')
    setFareSaving(true)

    try {
      await StaffService.createFareRule({
        fleet_id: Number(fareForm.fleet_id),
        seat_type: fareForm.seat_type,
        base_fare: Number(fareForm.base_fare),
        fare_per_km: Number(fareForm.fare_per_km),
      }, fareForm.step_up_token || null)

      setFareForm((prev) => ({ ...prev, base_fare: '', fare_per_km: '', step_up_token: '' }))
      setFareMsg('Fare rule applied successfully.')
    } catch (err) {
      setFareMsg(err?.message || 'Failed to apply fare rule. Ensure your step-up token is valid.')
    } finally {
      setFareSaving(false)
    }
  }

  const openFleetMap = (fleetId) => {
    const location = getLocationByFleet(fleetId)
    const lat = Number(location?.latitude)
    const lng = Number(location?.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank', 'noopener,noreferrer')
  }

  const displayTrips = [...trips]
    .filter((trip) => {
      const status = String(trip?.status || '').toLowerCase()
      return status !== 'cancelled' && status !== 'completed'
    })
    .sort((a, b) => new Date(a?.trip_date || 0) - new Date(b?.trip_date || 0))

  const fallbackTrips = [...fleets]
    .slice(0, 6)
    .map((fleet, index) => ({
      trip_id: `fleet-fallback-${fleet.fleet_id || index}`,
      status: fleet?.status || 'scheduled',
      fleet_route: {
        fleet,
        route: {
          route_name: 'Route pending assignment',
          origin: 'TBD',
          destination: 'TBD',
        },
        start_time: '',
      },
    }))

  const cards = displayTrips.length > 0 ? displayTrips.slice(0, 9) : fallbackTrips
  const focusedTrip = cards.find((trip) => String(trip.trip_id) === String(focusedTripId)) || null
  const focusedFleetId = focusedTrip?.fleet_route?.fleet?.fleet_id
  const focusedLocation = focusedTrip ? getLocationByFleet(focusedFleetId) : null
  const focusedLat = Number(focusedLocation?.latitude)
  const focusedLng = Number(focusedLocation?.longitude)
  const hasFocusedLocation = Number.isFinite(focusedLat) && Number.isFinite(focusedLng)
  const focusedOtherTrips = cards.filter((trip) => String(trip.trip_id) !== String(focusedTripId)).slice(0, 5)
  const todayLabel = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-5 rounded-3xl border border-slate-800 bg-[#0B1324] p-4 text-slate-100 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700/60 bg-[#101a30] px-4 py-3">
        <h2 className="text-2xl font-bold text-white">Active Monitoring</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">{todayLabel}</span>
          <button
            type="button"
            onClick={() => {
              onRefresh()
              void refreshFleetLocations()
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <form onSubmit={handleCreateFleet} className="rounded-2xl border border-slate-700 bg-[#101a30] p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">Add Fleet</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input value={fleetForm.plate_number} onChange={(event) => setFleetForm((prev) => ({ ...prev, plate_number: event.target.value }))} required placeholder="Plate number" className="rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500" />
            <select value={fleetForm.fleet_type} onChange={(event) => setFleetForm((prev) => ({ ...prev, fleet_type: event.target.value }))} className="rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500">
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
            <input type="number" min="0" value={fleetForm.seated_capacity} onChange={(event) => setFleetForm((prev) => ({ ...prev, seated_capacity: event.target.value }))} required placeholder="Seated capacity" className="rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500" />
            <input type="number" min="0" value={fleetForm.standing_capacity} onChange={(event) => setFleetForm((prev) => ({ ...prev, standing_capacity: event.target.value }))} required placeholder="Standing capacity" className="rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <button type="submit" disabled={manageSaving} className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60">Create Fleet</button>
        </form>

        <form onSubmit={handleAssignRoute} className="rounded-2xl border border-slate-700 bg-[#101a30] p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">Assign Route to Fleet</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <select value={assignForm.fleet_id} onChange={(event) => setAssignForm((prev) => ({ ...prev, fleet_id: event.target.value }))} required className="rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Select fleet</option>
              {fleets.map((fleet) => <option key={fleet.fleet_id} value={fleet.fleet_id}>{fleet.plate_number}</option>)}
            </select>
            <select value={assignForm.route_id} onChange={(event) => setAssignForm((prev) => ({ ...prev, route_id: event.target.value }))} required className="rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Select route</option>
              {routes.map((route) => <option key={route.route_id} value={route.route_id}>{route.route_name}</option>)}
            </select>
          </div>
          <button type="submit" disabled={manageSaving} className="mt-3 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60">Assign Route</button>
        </form>
      </div>

      <form onSubmit={handleApplyFareRule} className="rounded-2xl border border-slate-700 bg-[#101a30] p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">Apply Fare Rule</h3>
        <p className="mt-1 text-xs text-slate-400">Set pricing per fleet and seat type used during ticket booking.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <select value={fareForm.fleet_id} onChange={(event) => setFareForm((prev) => ({ ...prev, fleet_id: event.target.value }))} required className="rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">Fleet</option>
            {fleets.map((fleet) => <option key={`fare-fleet-${fleet.fleet_id}`} value={fleet.fleet_id}>{fleet.plate_number}</option>)}
          </select>
          <select value={fareForm.seat_type} onChange={(event) => setFareForm((prev) => ({ ...prev, seat_type: event.target.value }))} className="rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500">
            <option value="seated">Seated</option>
            <option value="standing">Standing</option>
          </select>
          <input type="number" min="0" step="0.01" value={fareForm.base_fare} onChange={(event) => setFareForm((prev) => ({ ...prev, base_fare: event.target.value }))} required placeholder="Base Fare" className="rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500" />
          <input type="number" min="0" step="0.01" value={fareForm.fare_per_km} onChange={(event) => setFareForm((prev) => ({ ...prev, fare_per_km: event.target.value }))} required placeholder="Fare / km" className="rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500" />
          <input type="text" value={fareForm.step_up_token} onChange={(event) => setFareForm((prev) => ({ ...prev, step_up_token: event.target.value }))} placeholder="Step-up token" className="rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500" />
        </div>
        <button type="submit" disabled={fareSaving} className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60">{fareSaving ? 'Applying...' : 'Apply Fare Rule'}</button>
        {fareMsg && (
          <p className={`mt-3 rounded-xl border px-3 py-2 text-sm ${fareMsg.toLowerCase().includes('failed') ? 'border-red-400/50 bg-red-500/10 text-red-200' : 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'}`}>
            {fareMsg}
          </p>
        )}
      </form>

      {manageMsg && (
        <p className={`rounded-xl border px-3 py-2 text-sm ${manageMsg.toLowerCase().includes('failed') ? 'border-red-400/50 bg-red-500/10 text-red-200' : 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'}`}>
          {manageMsg}
        </p>
      )}

      {!focusedTrip ? (
        <div className="rounded-2xl border border-slate-800 bg-[#0D162B] p-3 sm:p-4">
          <h3 className="mb-4 text-4xl font-bold leading-tight text-white">Fleets Trips</h3>
          {cards.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-[#15203a] px-4 py-5 text-sm text-slate-300">No fleet trips available yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((trip) => {
                const fleet = trip?.fleet_route?.fleet
                const route = trip?.fleet_route?.route
                const routeName = route?.route_name || `${route?.origin || 'TBD'} - ${route?.destination || 'TBD'}`
                const plate = fleet?.plate_number || `B-${fleet?.fleet_id || '--'}`
                const status = statusLabel(trip?.status)
                const progress = statusToProgress(trip?.status)
                const isOngoing = status === 'Ongoing'
                return (
                  <article key={trip.trip_id} className="rounded-2xl border border-slate-700 bg-[#18243A] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.25)]">
                    <div className="rounded-xl bg-[#222F45] p-3">
                      <p className="text-xl font-bold text-white">{routeName}</p>
                      <p className="text-sm text-slate-300">{plate}</p>
                      <p className="text-sm text-slate-300">{trip?.fleet_route?.start_time || '--:--'}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs font-semibold">
                      <span className="text-blue-300">Status</span>
                      <span className={`${isOngoing ? 'text-blue-400' : 'text-slate-300'}`}>{status}</span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#273550]">
                      <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFocusedTripId(trip.trip_id)}
                      className="mt-3 w-full rounded-xl bg-[#223150] px-3 py-2 text-lg font-bold text-white transition hover:bg-[#2B3D61]"
                    >
                      View Map
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-[#0D162B] p-3 sm:p-4">
          <button
            type="button"
            onClick={() => setFocusedTripId(null)}
            className="mb-3 inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-[#162440] px-3 py-1.5 text-sm font-semibold text-slate-200 hover:bg-[#1F3257]"
          >
            Back
          </button>

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
              <FleetTrackingMap trip={focusedTrip} location={focusedLocation} />
              <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-slate-700 bg-[#0d162b]/90 px-3 py-1 text-xs font-semibold text-slate-100">
                Live GPS
              </div>
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl border border-slate-700 bg-[#0d162b]/90 px-3 py-2 text-xs text-slate-200">
                <p className="text-[11px] text-slate-400">Current Bus</p>
                <p className="text-base font-bold text-white">{focusedTrip?.fleet_route?.fleet?.plate_number || 'B-000'}</p>
              </div>
              <div className="pointer-events-none absolute bottom-3 right-3 rounded-xl border border-slate-700 bg-[#0d162b]/90 px-3 py-2 text-xs text-slate-200">
                <p className="text-[11px] text-slate-400">Route</p>
                <p className="text-base font-bold text-white">{focusedTrip?.fleet_route?.route?.route_name || 'Route pending'}</p>
              </div>
            </div>

            <aside className="rounded-xl border border-slate-700 bg-[#121D33] p-3">
              <div className="mb-3 flex items-center gap-2">
                <h4 className="text-4xl font-bold text-white">Live Tracking</h4>
                <span className="rounded-full bg-[#1F2B47] px-3 py-1 text-sm font-semibold text-slate-200">Status</span>
              </div>
              <div className="rounded-xl border border-amber-400 bg-[#172742] p-2">
                <div className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-100">
                  <span>{focusedTrip?.fleet_route?.route?.route_name || 'Route pending'}</span>
                  <span>{focusedTrip?.fleet_route?.fleet?.plate_number || '-'}</span>
                  <span className="text-blue-400">{statusLabel(focusedTrip?.status)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#273550]">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${statusToProgress(focusedTrip?.status)}%` }} />
                </div>
              </div>

              <h5 className="mt-4 text-3xl font-bold text-white">Other Trips</h5>
              <div className="mt-2 space-y-2">
                {focusedOtherTrips.map((trip) => (
                  <div key={`other-${trip.trip_id}`} className="rounded-xl border border-slate-700 bg-[#1A2741] p-2">
                    <div className="flex items-center justify-between gap-2 text-sm text-slate-200">
                      <span>{trip?.fleet_route?.route?.route_name || 'Route pending'}</span>
                      <span>{trip?.fleet_route?.fleet?.plate_number || '-'}</span>
                      <span className="font-semibold text-blue-400">{statusLabel(trip?.status)}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#273550]">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${statusToProgress(trip?.status)}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={!hasFocusedLocation}
                onClick={() => openFleetMap(focusedFleetId)}
                className="mt-4 w-full rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Open in Google Maps
              </button>
            </aside>
          </div>
        </div>
      )}
    </div>
  )
}

function RoutesTab({ routes, stops, trips, onRefresh }) {
  const [expanded, setExpanded] = useState(null)
  const [manageMsg, setManageMsg] = useState('')
  const [manageSaving, setManageSaving] = useState(false)
  const [editingStopId, setEditingStopId] = useState(null)
  const [stopForm, setStopForm] = useState({ stop_name: '', location: '' })
  const [routeForm, setRouteForm] = useState({ route_name: '', origin: '', destination: '' })
  const [routeStopForm, setRouteStopForm] = useState({ route_id: '', stop_id: '', stop_order: '' })
  const [assignedStopIds, setAssignedStopIds] = useState([])
  const [suggestedStopOrder, setSuggestedStopOrder] = useState('')

  const handleCreateStop = async (event) => {
    event.preventDefault()
    setManageSaving(true)
    setManageMsg('')
    try {
      const payload = {
        stop_name: stopForm.stop_name,
        location: stopForm.location,
      }

      if (editingStopId) {
        await StaffService.updateOperatorStop(editingStopId, payload)
      } else {
        await StaffService.createOperatorStop(payload)
      }

      setStopForm({ stop_name: '', location: '' })
      setEditingStopId(null)
      setManageMsg(editingStopId ? 'Stop updated successfully.' : 'Stop created successfully.')
      onRefresh()
    } catch (err) {
      setManageMsg(err?.message || 'Failed to save stop.')
    } finally {
      setManageSaving(false)
    }
  }

  const handleDeleteStop = async (stopId) => {
    if (!window.confirm('Delete this stop?')) return
    setManageSaving(true)
    setManageMsg('')
    try {
      await StaffService.deleteOperatorStop(stopId)
      if (Number(editingStopId) === Number(stopId)) {
        setEditingStopId(null)
        setStopForm({ stop_name: '', location: '' })
      }
      setManageMsg('Stop deleted successfully.')
      onRefresh()
    } catch (err) {
      setManageMsg(err?.message || 'Failed to delete stop.')
    } finally {
      setManageSaving(false)
    }
  }

  const handleRemoveStopFromRoute = async (routeId, routeStopId) => {
    if (!routeId || !routeStopId) return
    if (!window.confirm('Remove this stop from route?')) return
    setManageSaving(true)
    setManageMsg('')
    try {
      await StaffService.removeOperatorStopFromRoute(Number(routeId), Number(routeStopId))
      setManageMsg('Stop removed from route successfully.')
      onRefresh()
    } catch (err) {
      setManageMsg(err?.message || 'Failed to remove stop from route.')
    } finally {
      setManageSaving(false)
    }
  }

  const handleCreateRoute = async (event) => {
    event.preventDefault()
    setManageSaving(true)
    setManageMsg('')
    try {
      await StaffService.createOperatorRoute(routeForm)
      setRouteForm({ route_name: '', origin: '', destination: '' })
      setManageMsg('Route created successfully.')
      onRefresh()
    } catch (err) {
      setManageMsg(err?.message || 'Failed to create route.')
    } finally {
      setManageSaving(false)
    }
  }

  const handleAddStopToRoute = async (event) => {
    event.preventDefault()
    setManageSaving(true)
    setManageMsg('')
    try {
      await StaffService.addOperatorStopToRoute(Number(routeStopForm.route_id), {
        stop_id: Number(routeStopForm.stop_id),
        stop_order: Number(routeStopForm.stop_order || suggestedStopOrder || 1),
      })
      setRouteStopForm((prev) => ({
        route_id: prev.route_id,
        stop_id: '',
        stop_order: String(Number(prev.stop_order || suggestedStopOrder || 1) + 1),
      }))
      setManageMsg('Stop assigned to route successfully.')
      onRefresh()
    } catch (err) {
      setManageMsg(err?.message || 'Failed to assign stop to route.')
    } finally {
      setManageSaving(false)
    }
  }

  useEffect(() => {
    const routeId = Number(routeStopForm.route_id)
    if (!Number.isFinite(routeId) || routeId <= 0) {
      const resetTimer = setTimeout(() => {
        setAssignedStopIds([])
        setSuggestedStopOrder('')
      }, 0)
      return () => clearTimeout(resetTimer)
    }

    let cancelled = false
    StaffService.getOperatorRoute(routeId)
      .then((res) => {
        if (cancelled) return
        const routeStops = res?.data?.route_stops || res?.data?.routeStops || []
        const nextAssigned = routeStops
          .map((row) => Number(row?.stop_id))
          .filter((value) => Number.isFinite(value))
        const maxOrder = routeStops.reduce((max, row) => {
          const value = Number(row?.stop_order)
          return Number.isFinite(value) ? Math.max(max, value) : max
        }, 0)

        setAssignedStopIds(nextAssigned)
        const nextOrder = String(maxOrder + 1)
        setSuggestedStopOrder(nextOrder)
        setRouteStopForm((prev) => ({
          ...prev,
          stop_order: prev.stop_order || nextOrder,
        }))
      })
      .catch(() => {
        if (cancelled) return
        setAssignedStopIds([])
      })

    return () => {
      cancelled = true
    }
  }, [routeStopForm.route_id])

  const availableStops = stops.filter((stop) => !assignedStopIds.includes(Number(stop?.stop_id)))

  const analyticsRows = routes.map((route) => {
    const routeTrips = trips.filter((trip) => Number(trip?.fleet_route?.route?.route_id) === Number(route?.route_id))
    const totalTrips = routeTrips.length
    const completedTrips = routeTrips.filter((trip) => String(trip?.status || '').toLowerCase() === 'completed').length
    const adherencePct = totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0

    const passengersTotal = routeTrips.reduce((sum, trip) => sum + Number(trip?.total_occupancy ?? 0), 0)
    const days = new Set(routeTrips.map((trip) => String(trip?.trip_date || '').slice(0, 10)).filter(Boolean)).size || 1
    const avgDailyPassengers = Math.round(passengersTotal / days)

    const hourBuckets = routeTrips.reduce((acc, trip) => {
      const startRaw = String(trip?.fleet_route?.start_time || '').trim()
      const hourLabel = /^\d{2}:\d{2}/.test(startRaw) ? `${startRaw.slice(0, 2)}:00` : 'Unscheduled'
      acc[hourLabel] = (acc[hourLabel] || 0) + 1
      return acc
    }, {})

    const peakEntry = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0]

    return {
      routeId: route.route_id,
      routeName: route.route_name,
      totalTrips,
      avgDailyPassengers,
      adherencePct,
      peakHour: peakEntry ? `${peakEntry[0]} (${peakEntry[1]} trips)` : 'No trip data',
    }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Routes</h2>
        <button type="button" onClick={onRefresh} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <form onSubmit={handleCreateStop} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{editingStopId ? 'Edit Stop' : 'Add Stop'}</h3>
          <div className="mt-3 grid gap-2">
            <input value={stopForm.stop_name} onChange={(event) => setStopForm((prev) => ({ ...prev, stop_name: event.target.value }))} required placeholder="Stop name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={stopForm.location} onChange={(event) => setStopForm((prev) => ({ ...prev, location: event.target.value }))} placeholder="Location label" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Coordinates are auto-resolved from location label and stop name.
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={manageSaving} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
              {editingStopId ? 'Update Stop' : 'Create Stop'}
            </button>
            {editingStopId && (
              <button
                type="button"
                onClick={() => {
                  setEditingStopId(null)
                  setStopForm({ stop_name: '', location: '' })
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <form onSubmit={handleCreateRoute} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Add Route</h3>
          <div className="mt-3 grid gap-2">
            <input value={routeForm.route_name} onChange={(event) => setRouteForm((prev) => ({ ...prev, route_name: event.target.value }))} required placeholder="Route name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={routeForm.origin} onChange={(event) => setRouteForm((prev) => ({ ...prev, origin: event.target.value }))} required placeholder="Origin" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={routeForm.destination} onChange={(event) => setRouteForm((prev) => ({ ...prev, destination: event.target.value }))} required placeholder="Destination" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={manageSaving} className="mt-3 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">Create Route</button>
        </form>

        <form onSubmit={handleAddStopToRoute} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Assign Stop to Route</h3>
          <div className="mt-3 grid gap-2">
            <select value={routeStopForm.route_id} onChange={(event) => setRouteStopForm((prev) => ({ ...prev, route_id: event.target.value }))} required className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">Select route</option>
              {routes.map((route) => <option key={`route-${route.route_id}`} value={route.route_id}>{route.route_name}</option>)}
            </select>
            <select value={routeStopForm.stop_id} onChange={(event) => setRouteStopForm((prev) => ({ ...prev, stop_id: event.target.value }))} required className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">Select stop</option>
              {availableStops.map((stop) => <option key={`stop-${stop.stop_id}`} value={stop.stop_id}>{stop.stop_name}</option>)}
            </select>
            <input type="number" min="1" value={routeStopForm.stop_order} onChange={(event) => setRouteStopForm((prev) => ({ ...prev, stop_order: event.target.value }))} required placeholder="Stop order" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            {suggestedStopOrder && (
              <p className="text-xs text-slate-500">Suggested next order: {suggestedStopOrder}</p>
            )}
          </div>
          <button type="submit" disabled={manageSaving} className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">Assign Stop</button>
        </form>
      </div>

      {manageMsg && (
        <p className={`rounded-lg border px-4 py-2 text-sm ${manageMsg.toLowerCase().includes('failed') ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {manageMsg}
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Stops Directory</h3>
          <p className="text-xs text-slate-500">Edit or remove stops used in route planning.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                {['ID', 'Stop', 'Location', 'Latitude', 'Longitude', 'Actions'].map((h) => (
                  <th key={`stops-${h}`} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stops.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">No stops found.</td></tr>
              ) : stops.map((stop) => (
                <tr key={`stop-row-${stop.stop_id}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">#{stop.stop_id}</td>
                  <td className="px-5 py-3 font-semibold text-slate-900">{stop.stop_name}</td>
                  <td className="px-5 py-3 text-slate-600">{stop.location || '-'}</td>
                  <td className="px-5 py-3 text-slate-600">{stop.latitude ?? '-'}</td>
                  <td className="px-5 py-3 text-slate-600">{stop.longitude ?? '-'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStopId(stop.stop_id)
                          setStopForm({
                            stop_name: stop.stop_name || '',
                            location: stop.location || '',
                          })
                        }}
                        className="rounded border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => { void handleDeleteStop(stop.stop_id) }}
                        className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                            <li key={rs.route_stop_id ?? idx} className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-3 py-1 text-xs text-slate-700">
                              <span>{idx+1}. {rs.stop?.stop_name || `Stop #${rs.stop_id}`}</span>
                              {(rs.route_stop_id || rs.id) && (
                                <button
                                  type="button"
                                  onClick={() => { void handleRemoveStopFromRoute(r.route_id, rs.route_stop_id || rs.id) }}
                                  className="rounded-full px-1 text-red-600 hover:bg-red-50"
                                  title="Remove stop from route"
                                >
                                  ×
                                </button>
                              )}
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

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Route Analytics</h3>
          <p className="text-xs text-slate-500">Includes total trips, average daily passengers, route adherence, and peak departure window.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                {['Route', 'Total Trips', 'Avg Daily Passengers', 'Route Adherence', 'Peak Hours'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analyticsRows.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">No route analytics available yet.</td></tr>
              ) : analyticsRows.map((row) => (
                <tr key={`analytics-${row.routeId}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{row.routeName}</td>
                  <td className="px-5 py-3 text-slate-700">{row.totalTrips}</td>
                  <td className="px-5 py-3 text-slate-700">{row.avgDailyPassengers}</td>
                  <td className="px-5 py-3 text-slate-700">{row.adherencePct}%</td>
                  <td className="px-5 py-3 text-slate-700">{row.peakHour}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function TripsTab({ trips, drivers, conductors, onRefresh }) {
  const [showModal, setShowModal]   = useState(false)
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [gpsHistory, setGpsHistory] = useState([])
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsMessage, setGpsMessage] = useState('')
  const [assignModal, setAssignModal]   = useState(null)
  const [confirmComplete, setConfirmComplete] = useState(null) // trip object pending confirmation
  const [form, setForm]             = useState({ fleet_route_id: '', trip_date: '', departure_time: '', trip_type: 'one_way', return_departure_time: '', driver_id: '', conductor_id: '', notes: '' })
  const [assignId, setAssignId]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [actionInFlight, setActionInFlight] = useState(null) // tripId currently being actioned
  const [msg, setMsg]               = useState('')
  const [fleetRoutes, setFleetRoutes] = useState([])

  const driverMap = new Map(drivers.map(d => [Number(getStaffCompanyUserId(d)), d]))
  const conductorMap = new Map(conductors.map(c => [Number(getStaffCompanyUserId(c)), c]))

  useEffect(() => {
    StaffService.getOperatorFleetRoutes().then(r => setFleetRoutes(r?.data ?? [])).catch(() => {})
  }, [])

  const handleSchedule = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('')
    try {
      await StaffService.scheduleTrip({
        fleet_route_id: Number(form.fleet_route_id),
        trip_date: form.trip_date,
        departure_time: form.departure_time,
        trip_type: form.trip_type,
        return_departure_time: form.trip_type === 'round_trip' ? form.return_departure_time : null,
        driver_id: Number(form.driver_id),
        conductor_id: Number(form.conductor_id),
        notes: form.notes,
      })
      setMsg('Trip scheduled.'); setForm({ fleet_route_id: '', trip_date: '', departure_time: '', trip_type: 'one_way', return_departure_time: '', driver_id: '', conductor_id: '', notes: '' }); setShowModal(false); onRefresh()
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

  const loadTripGpsHistory = async (tripId) => {
    if (!tripId) return
    setGpsLoading(true)
    setGpsMessage('')
    try {
      const res = await StaffService.getOperatorTripGpsHistory(tripId, { limit: 100 })
      const rows = Array.isArray(res?.data) ? res.data : []
      setGpsHistory(rows)
      if (rows.length === 0) setGpsMessage('No GPS history points recorded yet for this trip.')
    } catch (err) {
      setGpsHistory([])
      setGpsMessage(err?.message || 'Failed to load GPS history.')
    } finally {
      setGpsLoading(false)
    }
  }

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
                {['ID','Date','Departure','Route','Fleet','Driver','Conductor','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0
                ? <tr><td colSpan={9} className="px-5 py-8 text-center text-sm text-slate-400">No trips found.</td></tr>
                : sorted.map(t => {
                  const driverRow = t.driver || driverMap.get(Number(t.driver_id))
                  const conductorRow = t.conductor || conductorMap.get(Number(t.conductor_id))
                  const driverName = driverRow ? getStaffFullName(driverRow) || (driverRow?.user?.email || driverRow?.email) : null
                  const conductorName = conductorRow ? getStaffFullName(conductorRow) || (conductorRow?.user?.email || conductorRow?.email) : null
                  return (
                    <tr key={t.trip_id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">#{t.trip_id}</td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{fmtDate(t.trip_date)}</td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{String(t.departure_time || t.fleet_route?.start_time || '--:--').slice(0, 5)}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-30 truncate">{t.fleet_route?.route?.route_name || '-'}</td>
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
                          {['scheduled', 'delayed'].includes(t.status)    && <button type="button" onClick={() => handleAction(t.trip_id,'boarding')} disabled={actionInFlight === t.trip_id} className="rounded px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50">{actionInFlight === t.trip_id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Board'}</button>}
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
            <Field label="Trip Type" required>
              <select value={form.trip_type} onChange={e => setForm(p => ({ ...p, trip_type: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500">
                <option value="one_way">One-way</option>
                <option value="round_trip">Round Trip</option>
              </select>
            </Field>
            <Field label="Departure Time" type="time" value={form.departure_time} onChange={e => setForm(p => ({...p, departure_time: e.target.value}))} required />
            {form.trip_type === 'round_trip' && (
              <Field label="Return Departure Time" type="time" value={form.return_departure_time} onChange={e => setForm(p => ({ ...p, return_departure_time: e.target.value }))} required />
            )}
            <Field label="Driver" required>
              <select value={form.driver_id} onChange={e => setForm(p => ({ ...p, driver_id: e.target.value }))} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Select a driver…</option>
                {drivers.map(d => (
                  <option key={getStaffCompanyUserId(d)} value={getStaffCompanyUserId(d)}>
                    {getStaffFullName(d) || getStaffUsername(d)} ({getStaffEmail(d)})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Conductor" required>
              <select value={form.conductor_id} onChange={e => setForm(p => ({ ...p, conductor_id: e.target.value }))} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Select a conductor…</option>
                {conductors.map(c => (
                  <option key={getStaffCompanyUserId(c)} value={getStaffCompanyUserId(c)}>
                    {getStaffFullName(c) || getStaffUsername(c)} ({getStaffEmail(c)})
                  </option>
                ))}
              </select>
            </Field>
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
                  <option key={getStaffCompanyUserId(p)} value={getStaffCompanyUserId(p)}>{getStaffFullName(p) || getStaffUsername(p)} ({getStaffEmail(p)})</option>
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
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[['Date', fmtDate(selectedTrip.trip_date)],['Status', selectedTrip.status],['Route', selectedTrip.fleet_route?.route?.route_name],['Fleet', selectedTrip.fleet_route?.fleet?.plate_number],['Driver', getStaffFullName(selectedTrip.driver) || selectedTrip.driver?.user?.email || 'Unassigned'],['Conductor', getStaffFullName(selectedTrip.conductor) || selectedTrip.conductor?.user?.email || 'Unassigned'],['Revenue', fmt(selectedTrip.total_revenue)]].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">{value || '-'}</dd>
                </div>
              ))}
            </dl>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">GPS History</p>
                <button
                  type="button"
                  onClick={() => { void loadTripGpsHistory(selectedTrip.trip_id) }}
                  disabled={gpsLoading}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  {gpsLoading ? 'Loading...' : 'Load GPS Trail'}
                </button>
              </div>

              {gpsMessage && <p className="mb-2 text-xs text-slate-500">{gpsMessage}</p>}

              {gpsHistory.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-2 py-1.5 text-left text-slate-500">Time</th>
                        <th className="px-2 py-1.5 text-left text-slate-500">Latitude</th>
                        <th className="px-2 py-1.5 text-left text-slate-500">Longitude</th>
                        <th className="px-2 py-1.5 text-left text-slate-500">Speed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gpsHistory.slice(0, 50).map((point, index) => (
                        <tr key={`gps-${point.history_id ?? index}`} className="border-b border-slate-100">
                          <td className="px-2 py-1.5 text-slate-700">{fmtDate(point.recorded_at)}</td>
                          <td className="px-2 py-1.5 text-slate-700">{point.latitude ?? '-'}</td>
                          <td className="px-2 py-1.5 text-slate-700">{point.longitude ?? '-'}</td>
                          <td className="px-2 py-1.5 text-slate-700">{point.speed_kmh ?? '-'} km/h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
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

  const renderValue = (value) => {
    if (value == null || value === '') return '-'
    if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString('en-PH') : '-'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (Array.isArray(value)) {
      return value
        .map((entry) => {
          if (entry == null) return '-'
          if (typeof entry === 'object') {
            return Object.entries(entry)
              .map(([key, nestedValue]) => `${key.replace(/_/g, ' ')}: ${nestedValue ?? '-'}`)
              .join(' | ')
          }
          return String(entry)
        })
        .join('; ')
    }
    if (typeof value === 'object') {
      return Object.entries(value)
        .map(([key, nestedValue]) => `${key.replace(/_/g, ' ')}: ${nestedValue ?? '-'}`)
        .join(' | ')
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          const parsed = JSON.parse(trimmed)
          return renderValue(parsed)
        } catch {
          return value
        }
      }
    }

    return String(value)
  }

  const flattenRow = (row, prefix = '', output = {}) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return output

    Object.entries(row).forEach(([key, raw]) => {
      const column = prefix ? `${prefix}.${key}` : key

      if (raw == null || typeof raw === 'number' || typeof raw === 'boolean' || typeof raw === 'string') {
        output[column] = raw
        return
      }

      if (Array.isArray(raw)) {
        output[column] = raw.map((item) => {
          if (item == null) return '-'
          if (typeof item === 'object') {
            return Object.entries(item)
              .map(([nestedKey, nestedValue]) => `${nestedKey}: ${nestedValue ?? '-'}`)
              .join(', ')
          }
          return String(item)
        }).join(' | ')
        return
      }

      flattenRow(raw, column, output)
    })

    return output
  }

  const rawRows = Array.isArray(report)
    ? report
    : Array.isArray(report?.items)
      ? report.items
      : Array.isArray(report?.rows)
        ? report.rows
        : report && typeof report === 'object'
          ? [report]
          : []

  const reportRows = rawRows.map((row) => flattenRow(row))

  const reportColumns = reportRows.length > 0
    ? [...new Set(reportRows.flatMap(row => Object.keys(row || {})))].slice(0, 14)
    : []

  const handlePrintReport = () => {
    if (!report || reportRows.length === 0 || reportColumns.length === 0) {
      setMsg('Run a report first before printing.');
      return;
    }

    const fleetLabel = fleets.find((fleet) => String(fleet.fleet_id) === String(selectedFleet))?.plate_number || `Fleet ${selectedFleet}`;
    const reportLabel = reportType === 'financial'
      ? 'Financial Audit'
      : reportType === 'revenue'
        ? 'Revenue by Route'
        : reportType === 'adherence'
          ? 'Route Adherence'
          : reportType === 'occupancy'
            ? 'Occupancy Trends'
            : reportType === 'daily'
              ? 'Daily Summary'
              : 'Payment Channels';

    const popup = window.open('', '_blank', 'width=1200,height=780');
    if (!popup) {
      setMsg('Unable to open print preview. Please allow pop-ups for this site.');
      return;
    }

    const tableHead = reportColumns
      .map((column) => `<th>${column.replace(/_/g, ' ')}</th>`)
      .join('');

    const tableRows = reportRows
      .map((row) => `<tr>${reportColumns.map((column) => `<td>${String(renderValue(row?.[column]) || '-')}</td>`).join('')}</tr>`)
      .join('');

    popup.document.write(`
      <html>
        <head>
          <title>${reportLabel} - ${fleetLabel}</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; }
            .page { padding: 8px; }
            h1 { margin: 0; font-size: 20px; }
            .meta { margin-top: 8px; color: #334155; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; vertical-align: top; }
            th { background: #e2e8f0; text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; }
            tr:nth-child(even) td { background: #f8fafc; }
            .footer { margin-top: 10px; font-size: 10px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="page">
            <h1>Smart Transit Fleet Report</h1>
            <div class="meta">
              <div><strong>Fleet:</strong> ${fleetLabel}</div>
              <div><strong>Report:</strong> ${reportLabel}</div>
              <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
            </div>
            <table>
              <thead><tr>${tableHead}</tr></thead>
              <tbody>${tableRows}</tbody>
            </table>
            <p class="footer">Generated from Operator Dashboard Reports. This print view is PDF-ready via browser print dialog.</p>
          </div>
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);

    popup.document.close();
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Fleet Reports</h2>
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-40">
          <label className="mb-1 block text-xs font-medium text-slate-600">Fleet</label>
          <select value={selectedFleet} onChange={e => setSelectedFleet(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">Select fleet…</option>
            {fleets.map(f => <option key={f.fleet_id} value={f.fleet_id}>{f.plate_number}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-40">
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
        <div className="flex items-end">
          <button
            type="button"
            onClick={handlePrintReport}
            disabled={!report || reportRows.length === 0 || reportColumns.length === 0}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Print / Save PDF
          </button>
        </div>
      </div>
      {msg && <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{msg}</p>}
      {report && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {reportColumns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    {reportColumns.map(column => (
                      <th key={column} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{column.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((row, index) => (
                    <tr key={`report-row-${index}`} className="border-b border-slate-100 hover:bg-slate-50">
                      {reportColumns.map(column => (
                        <td key={`${index}-${column}`} className="px-3 py-2 text-slate-700">{renderValue(row?.[column])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No tabular rows available for this report yet.</p>
          )}
        </div>
      )}
    </div>
  )
}

function AccountTab({ profile }) {
  const user  = profile?.user ?? {}
  const staff = profile ?? {}
  const displayName = staff?.name || user?.name || user?.username || user?.email || 'Operator'
  return (
    <div className="max-w-xl space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Account</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-xl font-bold text-white">
            {String(displayName)[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{displayName}</p>
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
            <p className="mt-0.5 text-sm text-slate-500">OTP-based 2FA is mandatory for operator accounts and is always enforced on login.</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Always Enabled</span>
        </div>
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
  const [stops, setStops]           = useState([])
  const hasBootstrappedRef = useRef(false)
  const tripsPollInFlightRef = useRef(false)
  const hasLiveOpsTrips = trips.some((trip) => ['boarding', 'departed', 'in-progress'].includes(String(trip?.status || '').toLowerCase()))

  const loadFull = useCallback(async () => {
    try {
      const [profRes, tripsRes, driversRes, conductorsRes, fleetsRes, routesRes, stopsRes] = await Promise.allSettled([
        StaffService.getProfile('operator'),
        StaffService.getOperatorTrips(),
        StaffService.getOperatorDrivers(),
        StaffService.getOperatorConductors(),
        StaffService.getOperatorFleets(),
        StaffService.getOperatorRoutes(),
        StaffService.getOperatorStops(),
      ])
      if (profRes.status === 'fulfilled') {
        const p = profRes.value?.data ?? profRes.value
        setProfile(p)
      } else { navigate('/employee/login'); return }
      if (tripsRes.status === 'fulfilled')      setTrips(Array.isArray(tripsRes.value?.data) ? tripsRes.value.data : [])
      if (driversRes.status === 'fulfilled')    setDrivers(Array.isArray(driversRes.value?.data) ? driversRes.value.data : [])
      if (conductorsRes.status === 'fulfilled') setConductors(Array.isArray(conductorsRes.value?.data) ? conductorsRes.value.data : [])
      if (fleetsRes.status === 'fulfilled')     setFleets(Array.isArray(fleetsRes.value?.data) ? fleetsRes.value.data : [])
      if (routesRes.status === 'fulfilled')     setRoutes(Array.isArray(routesRes.value?.data) ? routesRes.value.data : [])
      if (stopsRes.status === 'fulfilled')      setStops(Array.isArray(stopsRes.value?.data) ? stopsRes.value.data : [])
    } finally { setLoading(false) }
  }, [navigate])

  const loadTripsOnly = useCallback(async () => {
    if (tripsPollInFlightRef.current) return
    tripsPollInFlightRef.current = true
    try {
      const tripsRes = await StaffService.getOperatorTrips()
      setTrips(Array.isArray(tripsRes?.data) ? tripsRes.data : [])
    } catch {
      // Keep existing trip state on transient poll errors.
    } finally {
      tripsPollInFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    if (hasBootstrappedRef.current) return
    hasBootstrappedRef.current = true
    void loadFull()
  }, [loadFull])

  useEffect(() => {
    if (activeTab !== 'dashboard') return undefined
    if (!hasLiveOpsTrips) return undefined

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      void loadTripsOnly()
    }, 45000)

    return () => clearInterval(intervalId)
  }, [activeTab, hasLiveOpsTrips, loadTripsOnly])

  const handleLogout = async () => {
    try { await StaffService.logoutOperator() } catch (error) { void error }
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
        {activeTab === 'staffs'     && (
          <StaffDirectoryTab drivers={drivers} conductors={conductors} onRefresh={loadFull} onCreateAccount={d => StaffService.createEmployeeAccount(d)} />
        )}
        {activeTab === 'fleets'     && <FleetsTab fleets={fleets} routes={routes} trips={trips} onRefresh={loadFull} />}
        {activeTab === 'routes'     && <RoutesTab routes={routes} stops={stops} trips={trips} onRefresh={loadFull} />}
        {activeTab === 'trips'      && <TripsTab trips={trips} drivers={drivers} conductors={conductors} onRefresh={loadFull} />}
        {activeTab === 'reports'    && <ReportsTab fleets={fleets} />}
        {activeTab === 'account'    && <AccountTab profile={profile} />}
      </main>
    </div>
  )
}

