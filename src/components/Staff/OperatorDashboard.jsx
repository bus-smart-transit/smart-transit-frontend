import { useState, useMemo } from 'react'
import StaffPortalLayout from './StaffPortalLayout'
import { buildOperatorForecast } from './routeForecast'
import RouteMap from '../Map/RouteMap'
import CalendarSummaryStrip from './CalendarSummaryStrip'
import HistoricalForecastPanel from './HistoricalForecastPanel'
import { openPrintReport } from '../../utils/printReport'
import OperatorService from '../../api/StaffService/OperatorService'
import { parseAppDate, getBusinessToday, debugLogBusinessTime } from '../../utils/dates'
import { useOperatorDashboardData, useNotificationBell, useTripRequests, useDispatchDecisions, useFleetsTab, useRoutesTab, useTripsTab, useReportsTab, useShiftBlocksTab } from '../../api/hooks/Staff/useOperatorDashboard'
import {
  LayoutDashboard, Bus, MapPin, Clock, PieChart, Users, Settings,
  Plus, Eye, RefreshCw, Shield, Download,
  X, ChevronDown, ChevronUp, Loader2, AlertTriangle, Bell, ArrowLeftRight,
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
  delayed:       'bg-rose-100 text-rose-700',
  boarding:      'bg-blue-100 text-blue-700',
  departed:      'bg-amber-100 text-amber-700',
  'in-progress': 'bg-amber-100 text-amber-700',
  completed:     'bg-emerald-100 text-emerald-700',
  cancelled:     'bg-red-100 text-red-700',
}

const NAV = [
  { key: 'dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { key: 'staffs',     label: 'Staffs',     icon: Users },
  { key: 'fleets',     label: 'Fleets',     icon: Bus },
  { key: 'routes',     label: 'Routes',     icon: MapPin },
  { key: 'trips',      label: 'Trips',      icon: Clock },
  { key: 'shiftBlocks', label: 'Shift Blocks', icon: ArrowLeftRight },
  { key: 'reports',    label: 'Reports',    icon: PieChart },
  { key: 'account',    label: 'Account',    icon: Settings },
]

const getStaffFullName = (row) => row?.name || row?.user?.name || row?.user?.username || row?.username || '-'
const getStaffUsername = (row) => row?.user?.username || row?.username || row?.name || '-'
const getStaffEmail = (row) => row?.user?.email || row?.email || '-'
const getStaffRole = (row) => row?.user?.role || row?.role || '-'
const getStaffJoinedAt = (row) => row?.user?.created_at || row?.created_at || null
const getStaffCompanyUserId = (row) => row?.company_user_id || row?.user_id || row?.id

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

// S2 (Batch 12): Operator-facing notification bell/badge — currently only
// populated by trip declines (Driver/Chauffeur declining an assignment).
function NotificationBell() {
  const {
    open, setOpen,
    notifications,
    unreadCount,
    loadingNotifications,
    handleMarkRead,
    handleMarkAllRead,
  } = useNotificationBell()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <Modal title="Notifications" onClose={() => setOpen(false)}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">{unreadCount} unread</span>
            <button type="button" onClick={handleMarkAllRead} className="text-xs font-semibold text-teal-600 hover:underline" disabled={unreadCount === 0}>
              Mark all as read
            </button>
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {loadingNotifications && notifications.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-lg border px-3 py-2.5 text-sm ${n.read_at ? 'border-slate-100 bg-slate-50 text-slate-500' : 'border-amber-200 bg-amber-50 text-amber-900'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{n.title}</p>
                    {!n.read_at && (
                      <button type="button" onClick={() => handleMarkRead(n.id)} className="shrink-0 text-xs font-semibold text-teal-600 hover:underline">
                        Mark read
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </>
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

const REQUEST_REASON_LABELS = { sick: 'Sick', vehicle_issue: 'Vehicle issue', schedule_conflict: 'Schedule conflict', other: 'Others' }

// C6: staff decline requests waiting for the Operator ("For Approval").
function TripRequestsPanel({ onDecided }) {
  const { requests, busyId, error, decide } = useTripRequests(onDecided)
  if (requests.length === 0 && !error) return null

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-sm font-bold text-amber-800">For Approval ({requests.length})</h2>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <ul className="mt-3 space-y-2">
        {requests.map((r) => {
          const route = r.trip?.fleet_route?.route
          const staffName = r.staff?.user?.name || r.staff?.name || 'Staff'
          const reason = r.reason_text || REQUEST_REASON_LABELS[r.reason_code] || 'No reason given'
          return (
            <li key={r.id} className="flex flex-col gap-2 rounded-xl border border-amber-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                <p className="font-semibold text-slate-900">{staffName} <span className="font-normal text-slate-500">({r.role})</span></p>
                <p className="text-xs text-slate-600">{route?.origin || '-'} → {route?.destination || '-'} · {r.trip?.trip_date}</p>
                <p className="text-xs text-slate-500">Reason: {reason}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={busyId === r.id} onClick={() => decide(r.id, 'approve')} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">Approve</button>
                <button type="button" disabled={busyId === r.id} onClick={() => decide(r.id, 'reject')} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">Reject</button>
              </div>
          </li>
          )
        })}
      </ul>
    </section>
  )
}

function DashboardTab({ trips, drivers, conductors, fleets, onRequestDecided }) {
  const { selectedDispatch } = useDispatchDecisions(trips)

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
      <TripRequestsPanel onDecided={onRequestDecided} />
      <CalendarSummaryStrip service={OperatorService} refreshKey={trips} />
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
          <div key={label} className="staff-card">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[['Drivers', drivers.length],['Conductors', conductors.length],['Fleets', fleets.length]].map(([label, value]) => (
          <div key={label} className="staff-card">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
      <div className="staff-card staff-card-roomy">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Route Health Summary</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Live Ops</span>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {routeHealth.map(item => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-2xl font-bold text-slate-900">{item.value}</span>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.tone}`}>{item.value > 0 ? 'Monitor' : 'Stable'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="staff-card staff-card-roomy">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Dispatch Decision Board</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Live</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Reroute alerts</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{predictiveReroutes.length}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Decision count</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{dispatchDecisionCount}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{dispatchDecisionCount > 0 ? 'Reviewing' : 'Awaiting route action'}</p>
          </div>
        </div>
      </div>
      <div className="staff-card staff-card-roomy">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Route Delay Overview</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">By Route</span>
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
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] ${badge}`}>{status}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="staff-card staff-card-roomy">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Recommended Actions</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Suggested</span>
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
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{rec.route}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{rec.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="staff-card staff-card-roomy">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Fleet Response View</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Dispatch</span>
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
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] ${row.priority === 'high' ? 'bg-red-100 text-red-700' : row.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
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
      <div className="staff-card staff-card-roomy">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Operational Alerts</h2>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">{alerts.length} Active</span>
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
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{alert.type}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{alert.detail}</p>
                  <p className="mt-2 text-xs text-slate-500">{alert.action}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="staff-card staff-card-roomy">
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
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', phone_num: '', address: '', birth_date: '', role: 'driver' })

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
      setForm({ name: '', username: '', email: '', password: '', phone_num: '', address: '', birth_date: '', role: roleFilter === 'all' ? 'driver' : roleFilter })
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

      <div className="staff-card staff-card-flush overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['Username', 'Email', 'Role', 'Availability', 'Joined'].map((header) => (
                <th key={header} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">No staff found for this filter.</td></tr>
            ) : (
              filteredStaff.map((row) => (
                <tr key={`${getStaffRole(row)}-${getStaffCompanyUserId(row)}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{getStaffUsername(row)}</td>
                  <td className="px-5 py-3 text-slate-600">{getStaffEmail(row)}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 capitalize">{getStaffRole(row) || row._resolvedRole}</span>
                  </td>
                  <td className="px-5 py-3">
                    {/* Batch 15, Item 4/9 completion (Batch 17, Issue #3):
                        Available/Not Available was already toggleable by the
                        Driver/Conductor themselves but never surfaced here. */}
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      row?.is_available
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-100 text-slate-500'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${row?.is_available ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {row?.is_available ? 'Available' : 'Not Available'}
                    </span>
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
            <Field label="Full Name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required placeholder="Juan Dela Cruz" />
            <Field label="Username" value={form.username} onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))} required placeholder="juan_dela_cruz" />
            <Field label="Email" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} required placeholder="juan@example.com" />
            <Field label="Phone Number" type="tel" value={form.phone_num} onChange={(event) => setForm((prev) => ({ ...prev, phone_num: event.target.value }))} required placeholder="09123456789" />
            <Field label="Address" value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} required placeholder="Street, Barangay, City" />
            <Field label="Birth Date (optional)" type="date" value={form.birth_date} onChange={(event) => setForm((prev) => ({ ...prev, birth_date: event.target.value }))} />
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
  // B4: the Operator map is the shared RouteMap layer. The line is the
  // assigned trip's canonical geometry (per leg direction) and the bus is the
  // server-projected, accuracy-filtered position, with an explicit
  // no-GPS / stale / weak / off-route state instead of a floating icon.
  const routeId = Number(location?.route_id ?? trip?.fleet_route?.route?.route_id)
  const vehicle = useMemo(() => (location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy_m,
        recordedAt: location.recorded_at || location.updated_at,
        routePosition: location.route_position,
      }
    : null), [location])

  return (
    <RouteMap
      routeId={Number.isFinite(routeId) && routeId > 0 ? routeId : null}
      direction={location?.leg_direction || trip?.leg_direction || 'outbound'}
      vehicle={vehicle}
      className="relative h-107.5 w-full"
    />
  )
}
function FleetsTab({ fleets, routes, trips, onRefresh }) {
  const { selectedDispatch, dispatching, handleDispatchDecision } = useDispatchDecisions(trips)
  const {
    focusedTripId, setFocusedTripId,
    manageMsg,
    manageSaving,
    fleetForm, setFleetForm,
    assignForm, setAssignForm,
    fareForm, setFareForm,
    fareSaving,
    fareMsg,
    refreshFleetLocations,
    statusToProgress,
    statusLabel,
    getLocationForTrip,
    handleCreateFleet,
    handleAssignRoute,
    handleApplyFareRule,
    openFleetMap,
  } = useFleetsTab({ onRefresh })

  const todayStart = getBusinessToday()
  const displayTrips = [...trips]
    .filter((trip) => {
      const status = String(trip?.status || '').toLowerCase()
      const tripDateStr = String(trip?.trip_date || '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1]
      return status !== 'cancelled' && status !== 'completed' && !!tripDateStr && tripDateStr === todayStart
    })
    .sort((a, b) => (parseAppDate(a?.trip_date)?.getTime() ?? 0) - (parseAppDate(b?.trip_date)?.getTime() ?? 0))

  const assignedFleetIds = new Set(displayTrips.map((trip) => Number(trip?.fleet_route?.fleet?.fleet_id)).filter(Number.isFinite))
  const unassignedFleets = fleets.filter((fleet) => !assignedFleetIds.has(Number(fleet?.fleet_id)))

  const cards = displayTrips.slice(0, 9)
  const focusedTrip = cards.find((trip) => String(trip.trip_id) === String(focusedTripId)) || null
  const focusedRouteName = focusedTrip?.fleet_route?.route?.route_name || 'Unassigned Route'
  const rerouteForecast = buildOperatorForecast(trips)
  const focusedReroute = (rerouteForecast.rerouteRecommendations || []).find((item) => item.route === focusedRouteName) || null
  const focusedComparison = (rerouteForecast.routeComparison || []).find((item) => item.route === focusedRouteName) || null
  const focusedFleetId = focusedTrip?.fleet_route?.fleet?.fleet_id
  const focusedLocation = getLocationForTrip(focusedTrip)
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

      <div className="staff-grid xl:grid-cols-2">
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
            <select value={fleetForm.route_id} onChange={(event) => setFleetForm((prev) => ({ ...prev, route_id: event.target.value }))} className="rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500 sm:col-span-2">
              <option value="">Route (optional)</option>
              {routes.map((route) => <option key={`create-route-${route.route_id}`} value={route.route_id}>{route.route_name}</option>)}
            </select>
            {fleetForm.route_id && (
              <>
                <input type="time" value={fleetForm.start_time} onChange={(event) => setFleetForm((prev) => ({ ...prev, start_time: event.target.value }))} required title="Route operating start time" className="rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500" />
                <input type="time" value={fleetForm.end_time} onChange={(event) => setFleetForm((prev) => ({ ...prev, end_time: event.target.value }))} required title="Route operating end time" className="rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500" />
              </>
            )}
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
            <input
              type="time"
              value={assignForm.start_time}
              onChange={(event) => setAssignForm((prev) => ({ ...prev, start_time: event.target.value }))}
              required
              className="rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500"
              title="Route operating start time"
            />
            <input
              type="time"
              value={assignForm.end_time}
              onChange={(event) => setAssignForm((prev) => ({ ...prev, end_time: event.target.value }))}
              required
              className="rounded-lg border border-slate-600 bg-[#0B1324] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-teal-500"
              title="Route operating end time"
            />
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
            <p className="rounded-xl border border-slate-700 bg-[#15203a] px-4 py-5 text-sm text-slate-300">No active or scheduled trips for today.</p>
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
                      <p className="text-sm text-slate-300">{trip?.departure_time || trip?.fleet_route?.start_time || '--:--'}</p>
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

          <div className="staff-grid lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                <FleetTrackingMap trip={focusedTrip} location={focusedLocation} />
                <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-slate-700 bg-[#0d162b]/90 px-3 py-1 text-xs font-semibold text-slate-100">
                  Live GPS
                </div>
                <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl border border-slate-700 bg-[#0d162b]/90 px-3 py-2 text-xs text-slate-200">
                  <p className="text-xs text-slate-400">Current Bus</p>
                  <p className="text-base font-bold text-white">{focusedTrip?.fleet_route?.fleet?.plate_number || 'B-000'}</p>
                </div>
                <div className="pointer-events-none absolute bottom-3 right-3 rounded-xl border border-slate-700 bg-[#0d162b]/90 px-3 py-2 text-xs text-slate-200">
                  <p className="text-xs text-slate-400">Route</p>
                  <p className="text-base font-bold text-white">{focusedTrip?.fleet_route?.route?.route_name || 'Route pending'}</p>
                </div>
              </div>

              <section className="rounded-xl border border-slate-700 bg-[#121D33] p-4 text-slate-100">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h5 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">Predictive Reroute</h5>
                  {focusedReroute && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] ${focusedReroute.priority === 'high' ? 'bg-red-100 text-red-700' : focusedReroute.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {focusedReroute.priority}
                    </span>
                  )}
                </div>
                {!focusedReroute && !focusedComparison ? (
                  <p className="text-xs text-slate-400">No reroute guidance is available for this fleet route right now.</p>
                ) : (
                  <div className="space-y-3">
                    {focusedReroute && (
                      <div className="rounded-lg border border-slate-700 bg-[#0D162B] p-3 text-xs">
                        <p className="font-semibold text-slate-100">{focusedReroute.route}</p>
                        <p className="mt-1 text-slate-300">{focusedReroute.recommendedAction}</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <p className="rounded-md bg-slate-900 px-2 py-1"><span className="text-slate-400">Risk:</span> <strong>{focusedReroute.riskScore}%</strong></p>
                          <p className="rounded-md bg-slate-900 px-2 py-1"><span className="text-slate-400">Next peak:</span> <strong>{focusedReroute.peakSlot}</strong></p>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={!!dispatching[focusedReroute.route]}
                            onClick={() => handleDispatchDecision(focusedReroute.route, 'accept', {
                              recommendation: focusedReroute.recommendedAction,
                              reason: focusedReroute.reason,
                            })}
                            className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                          >
                            {dispatching[focusedReroute.route] ? 'Saving...' : 'Acknowledge risk'}
                          </button>
                          <button
                            type="button"
                            disabled={!!dispatching[focusedReroute.route]}
                            onClick={() => handleDispatchDecision(focusedReroute.route, 'keep', {
                              recommendation: focusedReroute.recommendedAction,
                              reason: focusedReroute.reason,
                            })}
                            className="rounded border border-slate-600 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                          >
                            Keep current route
                          </button>
                        </div>
                        {selectedDispatch[focusedReroute.route] && (
                          <p className="mt-2 text-xs text-slate-400">Dispatch status: {selectedDispatch[focusedReroute.route] === 'accept' ? focusedReroute.dispatchAction : 'Current route retained.'}</p>
                        )}
                      </div>
                    )}

                    {focusedComparison && (
                      <div className="rounded-lg border border-slate-700 bg-[#0D162B] p-3 text-xs">
                        <p className="font-semibold text-slate-100">Live traffic comparison</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          <p className="rounded-md bg-slate-900 px-2 py-1"><span className="text-slate-400">Assigned ETA:</span> <strong>{focusedComparison.currentEtaMinutes == null ? 'Unavailable' : `${focusedComparison.currentEtaMinutes} min`}</strong></p>
                          <p className="rounded-md bg-slate-900 px-2 py-1"><span className="text-slate-400">Alternate ETA:</span> <strong>{focusedComparison.alternateEtaMinutes == null ? 'Unavailable' : `${focusedComparison.alternateEtaMinutes} min`}</strong></p>
                          <p className="rounded-md bg-slate-900 px-2 py-1"><span className="text-slate-400">Time saved:</span> <strong>{focusedComparison.timeSavedMinutes == null ? 'Unavailable' : `${focusedComparison.timeSavedMinutes} min`}</strong></p>
                        </div>
                        <p className="mt-2 text-slate-300">{focusedComparison.recommendation}</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            <aside className="rounded-xl border border-slate-700 bg-[#121D33] p-3">
        {unassignedFleets.length > 0 && (
          <div className="mt-5 rounded-2xl border border-slate-800 bg-[#0D162B] p-3 sm:p-4">
            <h3 className="mb-4 text-2xl font-bold leading-tight text-white">Available Fleets</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {unassignedFleets.map((fleet) => (
                <article key={`fleet-unassigned-${fleet.fleet_id}`} className="rounded-2xl border border-slate-700 bg-[#18243A] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.25)]">
                  <div className="rounded-xl bg-[#222F45] p-3">
                    <p className="text-xl font-bold text-white">{fleet?.plate_number || `Fleet ${fleet?.fleet_id || '-'}`}</p>
                    <p className="text-sm text-slate-300">{fleet?.fleet_type || 'public'} fleet</p>
                    <p className="text-sm text-slate-300">
                      {Array.isArray(fleet?.fleet_routes) && fleet.fleet_routes.length > 0
                        ? `Routes: ${fleet.fleet_routes.map((fr) => fr?.route?.route_name).filter(Boolean).join(', ') || 'assigned'}`
                        : 'No route assigned'}
                    </p>
                    <p className="text-sm text-slate-300">Pending trip assignment</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
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
  const {
    manageMsg,
    manageSaving,
    editingStopId, setEditingStopId,
    stopForm, setStopForm,
    routeForm, setRouteForm,
    routeStopForm, setRouteStopForm,
    assignedStopIds,
    suggestedStopOrder,
    handleCreateStop,
    handleDeleteStop,
    handleRemoveStopFromRoute,
    handleToggleCustomDropoff,
    handleCreateRoute,
    handleAddStopToRoute,
  } = useRoutesTab({ onRefresh })

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
      // Same underlying bug as Issue #2 (Batch 10/11): each trip's own
      // departure_time, not the fleet route's shared operating-hours
      // start_time, must drive per-trip bucketing — otherwise every trip on
      // a route collapses into one identical hour bucket.
      const startRaw = String(trip?.departure_time || trip?.fleet_route?.start_time || '').trim()
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

      <div className="staff-grid xl:grid-cols-3">
        <form onSubmit={handleCreateStop} className="staff-card">
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

        <form onSubmit={handleCreateRoute} className="staff-card">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Add Route</h3>
          <div className="mt-3 grid gap-2">
            <input value={routeForm.route_name} onChange={(event) => setRouteForm((prev) => ({ ...prev, route_name: event.target.value }))} required placeholder="Route name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={routeForm.origin} onChange={(event) => setRouteForm((prev) => ({ ...prev, origin: event.target.value }))} required placeholder="Origin" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={routeForm.destination} onChange={(event) => setRouteForm((prev) => ({ ...prev, destination: event.target.value }))} required placeholder="Destination" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={manageSaving} className="mt-3 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60">Create Route</button>
        </form>

        <form onSubmit={handleAddStopToRoute} className="staff-card">
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

      <div className="staff-card staff-card-flush overflow-hidden">
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

      <div className="staff-card staff-card-flush overflow-hidden">
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
                  {expanded === r.route_id && (
                    <tr key={`${r.route_id}-custom-dropoff`} className="bg-slate-50">
                      <td colSpan={6} className="px-8 py-3">
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={Boolean(r.allow_custom_dropoff)}
                            disabled={manageSaving}
                            onChange={(event) => { void handleToggleCustomDropoff(r.route_id, event.target.checked) }}
                          />
                          Allow passengers to pin a custom drop-off on this route
                        </label>
                        <p className="mt-1 text-xs text-slate-500">Off by default. The pin must be on the route line and ahead of where the passenger boards.</p>
                      </td>
                    </tr>
                  )}
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

      <div className="staff-card staff-card-flush overflow-hidden">
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
  const {
    showModal, setShowModal,
    selectedTrip, setSelectedTrip,
    tripFilter, setTripFilter,
    gpsHistory,
    gpsLoading,
    gpsMessage,
    assignModal, setAssignModal,
    confirmComplete, setConfirmComplete,
    statusOverrideSaving,
    statusOverrideMsg,
    form, setForm,
    assignId, setAssignId,
    saving,
    actionInFlight,
    msg, setMsg,
    fleetRoutes,
    visibleTrips,
    handleSchedule,
    handleAssign,
    handleAction,
    handleConfirmedComplete,
    handleStatusOverride,
    loadTripGpsHistory,
  } = useTripsTab({ trips, onRefresh })

  const driverMap = new Map(drivers.map(d => [Number(getStaffCompanyUserId(d)), d]))
  const conductorMap = new Map(conductors.map(c => [Number(getStaffCompanyUserId(c)), c]))

  const sorted = [...visibleTrips]
    .sort((a,b) => (parseAppDate(b.trip_date)?.getTime() ?? 0) - (parseAppDate(a.trip_date)?.getTime() ?? 0))

  // S3: split into "Today's Trips" (today + any past/overdue trips still
  // needing attention — the existing "Overdue" badge below already flags
  // those) and "Upcoming Trips" (strictly future-dated), using the same
  // Manila-anchored business-day helper relied on elsewhere in the app.
  const todaysTrips = sorted.filter((t) => {
    const tripDateStr = String(t?.trip_date || '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1]
    if (!tripDateStr) return true
    return tripDateStr <= getBusinessToday()
  })
  const upcomingTrips = sorted.filter((t) => {
    const tripDateStr = String(t?.trip_date || '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1]
    return Boolean(tripDateStr) && tripDateStr > getBusinessToday()
  })

  // S3: purely computed, non-persisted indicator — a trip whose scheduled
  // date has passed without ever being closed out (completed or cancelled).
  // Not a new status; just a visual flag layered on top of whatever status
  // the trip is currently stuck in, so Operator/Admin can spot it without a
  // manual search.
  const todayStart = getBusinessToday()
  debugLogBusinessTime('OperatorDashboard: overdue-trip flag check')
  const isOverdueUnclosed = (trip) => {
    const tripDateStr = String(trip?.trip_date || '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1]
    if (!tripDateStr) return false
    return tripDateStr < todayStart && !['completed', 'cancelled'].includes(trip?.status)
  }

  const defaultLegTimesByBlock = {
    morning: ['06:00', '08:30', '11:00', '13:30'],
    afternoon: ['12:00', '14:30', '17:00', '19:30'],
  }

  const updateLegTime = (index, value) => {
    setForm((prev) => ({
      ...prev,
      leg_departure_times: (Array.isArray(prev.leg_departure_times) ? prev.leg_departure_times : defaultLegTimesByBlock[prev.block_type] || defaultLegTimesByBlock.morning)
        .map((time, i) => (i === index ? value : time)),
    }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Trips</h2>        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="operator-trip-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter</label>
          <select
            id="operator-trip-filter"
            value={tripFilter}
            onChange={(event) => setTripFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">All</option>
            <option value="scheduled">Scheduled / Active</option>
            <option value="completed">Completed</option>
          </select>
          <button type="button" onClick={onRefresh} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button type="button" onClick={() => { setShowModal(true); setMsg('') }} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            <Plus className="h-4 w-4" /> +Schedule
          </button>
        </div>
      </div>
      {msg && <p className="rounded-lg bg-teal-50 border border-teal-200 px-4 py-2 text-sm text-teal-800">{msg}</p>}
      {[
        { key: 'today', title: "Today's Trips", list: todaysTrips },
        { key: 'upcoming', title: 'Upcoming Trips', list: upcomingTrips },
      ].map(({ key, title, list }) => (
        <div key={key} className="staff-card staff-card-flush overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <span className="text-xs font-medium text-slate-500">{list.length} trip{list.length === 1 ? '' : 's'}</span>
          </div>
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
                {list.length === 0
                  ? <tr><td colSpan={9} className="px-5 py-8 text-center text-sm text-slate-400">No trips found.</td></tr>
                  : list.map(t => {
                    const driverRow = t.driver || driverMap.get(Number(t.driver_id))
                    const conductorRow = t.conductor || conductorMap.get(Number(t.conductor_id))
                    const driverName = driverRow ? getStaffFullName(driverRow) || (driverRow?.user?.email || driverRow?.email) : null
                    const conductorName = conductorRow ? getStaffFullName(conductorRow) || (conductorRow?.user?.email || conductorRow?.email) : null
                    return (
                      <tr key={t.trip_id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">#{t.trip_id}</td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{fmtDate(t.trip_date)}</td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{String(t.departure_time || t.fleet_route?.start_time || '--:--').slice(0, 5)}</td>
                        <td className="px-4 py-3 text-slate-700 max-w-30 truncate">
                          {t.fleet_route?.route?.route_name || '-'}
                          {t.shift_block_id
                            ? <span className="ml-1.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs font-semibold text-indigo-700" title="Auto-generated from a Shift Block">Block</span>
                            : <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500" title="Manually created ad hoc/charter trip">Ad hoc</span>}
                        </td>
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
                          {isOverdueUnclosed(t) && (
                            <span
                              className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 whitespace-nowrap"
                              title="Scheduled date has passed and this trip was never marked completed or cancelled."
                            >
                              <AlertTriangle className="h-3 w-3" /> Overdue
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {['scheduled', 'delayed'].includes(t.status)    && <button type="button" onClick={() => handleAction(t.trip_id,'boarding')} disabled={actionInFlight === t.trip_id} className="rounded px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50">{actionInFlight === t.trip_id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Board'}</button>}
                            {t.status === 'boarding'     && <button type="button" onClick={() => handleAction(t.trip_id,'depart')} disabled={actionInFlight === t.trip_id} className="rounded px-2 py-1 text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50">{actionInFlight === t.trip_id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Depart'}</button>}
                            {['departed','in-progress'].includes(t.status) && <button type="button" onClick={() => handleAction(t.trip_id,'complete')} disabled={actionInFlight === t.trip_id} className="rounded px-2 py-1 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50">Complete</button>}
                            {isOverdueUnclosed(t) && <button type="button" onClick={() => setSelectedTrip(t)} className="rounded px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200">Update Status</button>}
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
      ))}

      {showModal && (
        <Modal title="Schedule Service" onClose={() => setShowModal(false)}>
          <p className="-mt-2 mb-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            One unified schedule form: choose <strong>One-way</strong> for ad hoc/charter trips, or <strong>Round trip</strong> for shift-block scheduling.
          </p>
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
                <option value="one_way">One-way (Ad hoc / Charter)</option>
                <option value="round_trip">Round trip (Shift Block)</option>
              </select>
            </Field>

            {form.trip_type === 'one_way' ? (
              <>
                <Field label="Departure Time" type="time" value={form.departure_time} onChange={e => setForm(p => ({...p, departure_time: e.target.value}))} required />
                <Field label="Notes (optional)" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Any notes…" />
              </>
            ) : (
              <>
                <Field label="Block Type" required>
                  <select
                    value={form.block_type}
                    onChange={e => setForm(p => ({
                      ...p,
                      block_type: e.target.value,
                      leg_departure_times: defaultLegTimesByBlock[e.target.value] || defaultLegTimesByBlock.morning,
                    }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  {(Array.isArray(form.leg_departure_times) ? form.leg_departure_times : defaultLegTimesByBlock[form.block_type] || defaultLegTimesByBlock.morning).map((time, index) => (
                    <Field
                      key={`leg-time-${index}`}
                      label={`Leg ${index + 1} Departure`}
                      type="time"
                      value={time}
                      onChange={(e) => updateLegTime(index, e.target.value)}
                      required
                    />
                  ))}
                </div>
              </>
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

            {isOverdueUnclosed(selectedTrip) && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Overdue — this trip's scheduled date has passed and it was never marked completed or cancelled.
              </div>
            )}

            {(['departed', 'in-progress'].includes(selectedTrip.status) || isOverdueUnclosed(selectedTrip)) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-900">Update Status</p>
                <p className="mt-1 text-xs text-amber-700">
                  {['departed', 'in-progress'].includes(selectedTrip.status)
                    ? 'Use this if the driver forgot to complete the trip on their end.'
                    : "This trip's scheduled date has passed without departing. Operators can only close out a trip that already departed \u2014 if it never departed, ask an Admin to resolve it."}
                </p>
                <button
                  type="button"
                  onClick={() => handleStatusOverride(selectedTrip.trip_id, 'completed')}
                  disabled={statusOverrideSaving}
                  className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {statusOverrideSaving ? 'Updating...' : 'Force Complete'}
                </button>
                {statusOverrideMsg && <p className="mt-2 text-xs font-medium text-amber-800">{statusOverrideMsg}</p>}
              </div>
            )}

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

const BLOCK_STATUS_CHIP = {
  scheduled: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}
const AUDIT_STATUS_CHIP = {
  not_applicable: 'bg-slate-100 text-slate-500',
  pending_review: 'bg-amber-100 text-amber-700',
  reviewed: 'bg-emerald-100 text-emerald-700',
}

// Batch 18: Shift Block Hand-off System — Operator/Dispatcher tab.
// Section 4.1's dynamic action-button table: Scheduled -> Cancel;
// In Progress -> Dispatcher override hand-off (exception handling,
// Section 4.3 — normal hand-off is conductor-initiated from their own
// portal once the GPS/final-leg eligibility check passes); Completed ->
// audit_status badge + Mark Reviewed.
function ShiftBlocksTab({ onOpenScheduler }) {
  const {
    blocks,
    statusFilter, setStatusFilter,
    loading,
    msg,
    handleCancel,
    handleOverrideHandoff,
    handleMarkReviewed,
  } = useShiftBlocksTab()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Shift Blocks</h2>
        <div className="flex flex-wrap items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <option value="all">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button type="button" onClick={onOpenScheduler} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            <Plus className="h-4 w-4" /> +Schedule
          </button>
        </div>
      </div>

      {msg && <p className="rounded-lg bg-teal-50 border border-teal-200 px-4 py-2 text-sm text-teal-800">{msg}</p>}

      <div className="staff-card staff-card-flush overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['Date', 'Type', 'Fleet', 'Driver', 'Conductor', 'Status', 'Audit', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-slate-400">Loading…</td></tr>
            ) : blocks.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-slate-400">No shift blocks found.</td></tr>
            ) : blocks.map((b) => (
              <tr key={b.shift_block_id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{fmtDate(b.scheduled_date)}</td>
                <td className="px-4 py-3 text-slate-700 capitalize">{b.block_type}</td>
                <td className="px-4 py-3 text-slate-700">{b.fleet?.plate_number || '-'}</td>
                <td className="px-4 py-3 text-slate-700">{getStaffFullName(b.driver) || `#${b.driver_id}`}</td>
                <td className="px-4 py-3 text-slate-700">{getStaffFullName(b.conductor) || `#${b.conductor_id}`}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${BLOCK_STATUS_CHIP[b.status] ?? 'bg-slate-100 text-slate-600'}`}>{b.status}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${AUDIT_STATUS_CHIP[b.audit_status] ?? 'bg-slate-100 text-slate-600'}`}>{b.audit_status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {b.status === 'scheduled' && (
                      <button type="button" onClick={() => handleCancel(b.shift_block_id)} className="rounded px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200">Cancel</button>
                    )}
                    {b.status === 'in_progress' && (
                      <button type="button" onClick={() => handleOverrideHandoff(b.shift_block_id)} className="rounded px-2 py-1 text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200" title="Dispatcher override — force hand-off regardless of GPS state (exception handling)">Override Hand-off</button>
                    )}
                    {b.status === 'completed' && b.audit_status === 'pending_review' && (
                      <button type="button" onClick={() => handleMarkReviewed(b.shift_block_id)} className="rounded px-2 py-1 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Mark Reviewed</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}

function ReportsTab({ fleets, trips, routes }) {
  const [view, setView] = useState('fleet')
  const {
    selectedFleet, setSelectedFleet,
    reportType, setReportType,
    report,
    loading,
    msg, setMsg,
    fetchReport,
  } = useReportsTab()

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

    const opened = openPrintReport({
      title: `${reportLabel} - ${fleetLabel}`,
      meta: [['Fleet', fleetLabel], ['Report', reportLabel]],
      columns: reportColumns,
      rows: reportRows,
      format: (value) => String(renderValue(value)),
    });
    if (!opened) setMsg('Unable to open print preview. Please allow pop-ups for this site.');
  }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">{view === 'forecast' ? 'Historical Forecast' : 'Fleet Reports'}</h2>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm font-semibold">
          {[['fleet', 'Fleet Reports'], ['forecast', 'Historical Forecast']].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setView(key)} className={`rounded-md px-3 py-1.5 ${view === key ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>
          ))}
        </div>
      </div>
      {view === 'forecast' ? (<HistoricalForecastPanel trips={trips} routes={routes} fleets={fleets} />) : (<>
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
        <div className="staff-card">
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
      </>)}
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
      <div className="staff-card staff-card-roomy space-y-4">
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
      <div className="staff-card staff-card-roomy">
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
  const {
    activeTab, setActiveTab,
    loading,
    profile,
    trips,
    drivers,
    conductors,
    fleets,
    routes,
    stops,
    loadFull,
    handleLogout,
    handleCreateAccount,
  } = useOperatorDashboardData()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading dashboard…</div>
      </div>
    )
  }

  return (
    <StaffPortalLayout
      brandLabel="Operator Portal"
      brandIcon={Bus}
      navItems={NAV}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      profile={profile ? { name: profile?.name || profile?.user?.name || profile?.user?.username || profile?.user?.email || 'Operator' } : null}
      profileRoleLabel="Operator"
      profileInitialFallback="O"
      onLogout={handleLogout}
    >
        <div className="mb-4 flex justify-end">
          <NotificationBell />
        </div>
        {activeTab === 'dashboard'  && <DashboardTab trips={trips} drivers={drivers} conductors={conductors} fleets={fleets} onRequestDecided={loadFull} />}
        {activeTab === 'staffs'     && (
          <StaffDirectoryTab drivers={drivers} conductors={conductors} onRefresh={loadFull} onCreateAccount={handleCreateAccount} />
        )}
        {activeTab === 'fleets'     && <FleetsTab fleets={fleets} routes={routes} trips={trips} onRefresh={loadFull} />}
        {activeTab === 'routes'     && <RoutesTab routes={routes} stops={stops} trips={trips} onRefresh={loadFull} />}
        {activeTab === 'trips'      && <TripsTab trips={trips} drivers={drivers} conductors={conductors} onRefresh={loadFull} />}
        {activeTab === 'shiftBlocks' && <ShiftBlocksTab onOpenScheduler={() => setActiveTab('trips')} />}
        {activeTab === 'reports'    && <ReportsTab fleets={fleets} trips={trips} routes={routes} />}
        {activeTab === 'account'    && <AccountTab profile={profile} />}
    </StaffPortalLayout>
  )
}




