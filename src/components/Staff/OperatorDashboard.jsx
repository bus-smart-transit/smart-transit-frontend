import { useState, useEffect, useCallback } from 'react'
import StaffPortalLayout from './StaffPortalLayout'
import OperatorDashboardPage from './Operator/OperatorDashboardPage'
import FleetsPage from './Operator/FleetsPage'
import StaffCalendar from './StaffCalendar'
import { ModalShell } from '../ui/Modal'
import HistoricalForecastPanel from './HistoricalForecastPanel'
import { openPrintReport } from '../../utils/printReport'
import OperatorService from '../../api/StaffService/OperatorService'
import { getBookingWindow } from '../../services/bookingService'
import { bookingWindowWarning } from '../../utils/bookingQuery'
import { parseAppDate, getBusinessToday, debugLogBusinessTime } from '../../utils/dates'
import { useOperatorDashboardData, useNotificationBell, useTripRequests, useRoutesTab, useTripsTab, useReportsTab } from '../../api/hooks/Staff/useOperatorDashboard'
import RunInfoChips from '../ui/RunInfoChips'
import { CancelTripModal, TicketResolutionQueue } from './TripCancellationsPanel'
import DurationFactorsPanel from './DurationFactorsPanel'
import DropoffRulesPanel from './DropoffRulesPanel'
import LegTimeSuggestion from './LegTimeSuggestion'
import SchedulePage from './Schedule/SchedulePage'
import ShiftBlocksView from './Schedule/ShiftBlocksView'
import FinancePage from './Finance/FinancePage'
import { OPERATOR_ROLE, navForRole, viewsForRole } from '../../utils/operatorNav'
import {
  LayoutDashboard, Bus, MapPin, PieChart, Users, Settings, Wallet, CalendarDays,
  Plus, Eye, RefreshCw, Shield, Download,
  X, ChevronDown, ChevronUp, Loader2, AlertTriangle, Bell,
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

// Batch 30: Trips, Calendar and Shift Blocks are the three views of Schedule; Financials and Remittances are tabs of
// Finance; Reports stays its own item (fleet reports and the forecast are not financial). The items, their views and
// the roles that may see them are in utils/operatorNav.js; this only attaches the icons.
const NAV_ICONS = {
  dashboard: LayoutDashboard, staffs: Users, fleets: Bus, routes: MapPin, schedule: CalendarDays, finance: Wallet, reports: PieChart, account: Settings,
}
const NAV = navForRole(OPERATOR_ROLE).map((item) => ({ ...item, icon: NAV_ICONS[item.key] }))

const getStaffFullName = (row) => row?.name || row?.user?.name || row?.user?.username || row?.username || '-'
const getStaffUsername = (row) => row?.user?.username || row?.username || row?.name || '-'
const getStaffEmail = (row) => row?.user?.email || row?.email || '-'
const getStaffRole = (row) => row?.user?.role || row?.role || '-'
const getStaffJoinedAt = (row) => row?.user?.created_at || row?.created_at || null
const getStaffCompanyUserId = (row) => row?.company_user_id || row?.user_id || row?.id

function Modal({ title, onClose, children }) {
  return (
    <ModalShell label={title} onClose={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </ModalShell>
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

function Field({ label, type = 'text', value, onChange, required, placeholder, hint, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      {children ?? (
        <input type={type} value={value} onChange={onChange} required={required} placeholder={placeholder}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500" />
      )}
      {hint && <p role="status" className="mt-1 text-xs text-amber-700">{hint}</p>}
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
                {r.shift_block_id && (
                  <p className="text-xs font-semibold text-amber-800" data-testid="request-block-label">Shift block #{r.shift_block_id}: all {r.legs_count} legs. Approving releases {staffName} from the whole block.</p>
                )}
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
    handleToggleStopExpress,
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
              {['ID','Name','Origin','Destination','Stops','Custom drop-off',''].map((h,i) => (
                <th key={i} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {routes.length === 0
              ? <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">No routes found.</td></tr>
              : routes.map(r => (
                <>
                  <tr key={r.route_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">#{r.route_id}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">{r.route_name}</td>
                    <td className="px-5 py-3 text-slate-600">{r.origin || '-'}</td>
                    <td className="px-5 py-3 text-slate-600">{r.destination || '-'}</td>
                    <td className="px-5 py-3 text-slate-600">{r.route_stops?.length ?? 0}</td>
                    <td className="px-5 py-3">
                      <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(r.allow_custom_dropoff)}
                          disabled={manageSaving}
                          onChange={(event) => { void handleToggleCustomDropoff(r.route_id, event.target.checked) }}
                          aria-label={`Allow custom drop-off pins on ${r.route_name}`}
                        />
                        {r.allow_custom_dropoff ? 'On' : 'Off'}
                      </label>
                    </td>
                    <td className="px-5 py-3">
                      <button type="button" onClick={() => setExpanded(expanded === r.route_id ? null : r.route_id)} className="text-teal-600 hover:text-teal-700">
                        {expanded === r.route_id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                  {expanded === r.route_id && (
                    <tr key={`${r.route_id}-custom-dropoff`} className="bg-slate-50">
                      <td colSpan={7} className="px-8 py-3">
                        <p className="text-xs text-slate-500">Custom drop-off lets passengers pin a drop-off point on this route (off by default). The pin must be on the route line and ahead of where the passenger boards.</p>
                      </td>
                    </tr>
                  )}
                  {expanded === r.route_id && r.route_stops?.length > 0 && (
                    <tr key={`${r.route_id}-stops`} className="bg-slate-50">
                      <td colSpan={7} className="px-8 py-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Stops</p>
                        <ol className="flex flex-wrap gap-2">
                          {r.route_stops.sort((a,b) => a.stop_order - b.stop_order).map((rs, idx) => (
                            <li key={rs.route_stop_id ?? idx} className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-3 py-1 text-xs text-slate-700">
                              <span>{idx+1}. {rs.stop?.stop_name || `Stop #${rs.stop_id}`}</span>
                              {rs.stop_type !== 'pass_through' && (rs.route_stop_id || rs.id) && (
                                <label className="inline-flex items-center gap-1 text-[11px] text-amber-800" title="Express trips stop here">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(rs.served_by_express)}
                                    disabled={manageSaving}
                                    onChange={(event) => { void handleToggleStopExpress(r.route_id, rs.route_stop_id || rs.id, event.target.checked) }}
                                    aria-label={`Express trips stop at ${rs.stop?.stop_name || rs.stop_id}`}
                                  />
                                  Express
                                </label>
                              )}
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

      <DropoffRulesPanel service={OperatorService} routes={routes} onRoutesChanged={onRefresh} />
      <DurationFactorsPanel service={OperatorService} routes={routes} />
    </div>
  )
}

// Batch 30: the create form behind the one "+ Schedule" button of the Schedule page (it was inside the Trips view). It
// is the same form and the same handler (useTripsTab); only its place changed, so it opens from any Schedule view.
function ScheduleServiceModal({ state, drivers, conductors }) {
  const { showModal, setShowModal, form, setForm, saving, msg, fleetRoutes, handleSchedule } = state
  const [bookingWindow, setBookingWindow] = useState(null)
  useEffect(() => {
    if (!showModal) return undefined
    let cancelled = false
    getBookingWindow().then((w) => { if (!cancelled) setBookingWindow(w) }).catch(() => { if (!cancelled) setBookingWindow(null) })
    return () => { cancelled = true }
  }, [showModal])

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

  if (!showModal) return null

  return (    <Modal title="Schedule Service" onClose={() => setShowModal(false)}>
      <p className="-mt-2 mb-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
        One unified schedule form: choose <strong>One-way</strong> for ad hoc/charter trips, or <strong>Round trip</strong> for shift-block scheduling.
      </p>
      <form className="space-y-4" onSubmit={handleSchedule}>
        <Field label="Fleet Route" required>
          <select value={form.fleet_route_id} onChange={e => setForm(p => ({...p, fleet_route_id: e.target.value}))} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">Select a fleet routeâ€¦</option>
            {fleetRoutes.map(fr => (
              <option key={fr.fleet_route_id} value={fr.fleet_route_id}>{fr.fleet?.plate_number} â€” {fr.route?.route_name}</option>
            ))}
          </select>
        </Field>
        <Field label="Trip Date" type="date" value={form.trip_date} onChange={e => setForm(p => ({...p, trip_date: e.target.value}))} required hint={bookingWindowWarning(form.trip_date, bookingWindow)} />
        <Field label="Trip Type" required>
          <select value={form.trip_type} onChange={e => setForm(p => ({ ...p, trip_type: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500">
            <option value="one_way">One-way (Ad hoc / Charter)</option>
            <option value="round_trip">Round trip (Shift Block)</option>
          </select>
        </Field>
        <Field label="Service Type" required>
          <select value={form.service_type || 'regular'} onChange={e => setForm(p => ({ ...p, service_type: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500" data-testid="service-type-select">
            <option value="regular">Regular (stops at every stop)</option>
            <option value="express">Express (limited stops, no fare yet)</option>
          </select>
        </Field>

        {form.trip_type === 'one_way' ? (
          <>
            <Field label="Departure Time" type="time" value={form.departure_time} onChange={e => setForm(p => ({...p, departure_time: e.target.value}))} required />
            <Field label="Notes (optional)" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Any notesâ€¦" />
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
            <LegTimeSuggestion
              fleetRouteId={form.fleet_route_id}
              date={form.trip_date}
              firstTime={(Array.isArray(form.leg_departure_times) ? form.leg_departure_times : defaultLegTimesByBlock[form.block_type] || defaultLegTimesByBlock.morning)[0]}
              serviceType={form.service_type || 'regular'}
              expectedLegs={(Array.isArray(form.leg_departure_times) ? form.leg_departure_times : defaultLegTimesByBlock[form.block_type] || defaultLegTimesByBlock.morning).length}
              onApply={(times) => setForm((prev) => ({ ...prev, leg_departure_times: times }))}
            />
          </>
        )}
        <Field label="Driver" required>
          <select value={form.driver_id} onChange={e => setForm(p => ({ ...p, driver_id: e.target.value }))} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">Select a driverâ€¦</option>
            {drivers.map(d => (
              <option key={getStaffCompanyUserId(d)} value={getStaffCompanyUserId(d)}>
                {getStaffFullName(d) || getStaffUsername(d)} ({getStaffEmail(d)})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Conductor" required>
          <select value={form.conductor_id} onChange={e => setForm(p => ({ ...p, conductor_id: e.target.value }))} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">Select a conductorâ€¦</option>
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
  )
}
function TripsTab({ drivers, conductors, onRefresh, tripsState }) {
  const {
    selectedTrip, setSelectedTrip,
    tripFilter, setTripFilter,
    gpsHistory,
    gpsLoading,
    gpsMessage,
    assignModal, setAssignModal,
    confirmComplete, setConfirmComplete,
    statusOverrideSaving,
    statusOverrideMsg,
    assignId, setAssignId,
    saving,
    actionInFlight,
    msg, setMsg,
    visibleTrips,
    handleAssign,
    handleAction,
    handleConfirmedComplete,
    handleStatusOverride,
    loadTripGpsHistory,
  } = tripsState
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelNotice, setCancelNotice] = useState('')

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Trips</h3>
        <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </div>
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
                        <td className="px-4 py-3 text-slate-700">{t.fleet_route?.fleet?.plate_number || '-'} <RunInfoChips runPattern={t.run_info?.run_pattern} service={t.run_info?.service} serviceType={t.service_type} /></td>
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
                            {['scheduled', 'delayed', 'boarding', 'departed', 'in-progress'].includes(t.status) && <button type="button" onClick={() => setCancelTarget(t)} className="rounded px-2 py-1 text-xs bg-red-50 text-red-700 hover:bg-red-100">Cancel</button>}
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


      {cancelNotice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{cancelNotice}</p>}
      <TicketResolutionQueue service={OperatorService} />
      {cancelTarget && (
        <CancelTripModal trip={cancelTarget} service={OperatorService} onClose={() => setCancelTarget(null)} onDone={(text) => { setCancelNotice(text); onRefresh() }} />
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

// Batch 30: the Schedule page. One page for what used to be three sidebar items (Trips, Calendar, Shift Blocks): the
// views are Calendar, Blocks (Schedule/ShiftBlocksView.jsx) and Trips, and the one "+ Schedule" button opens the
// existing create form from any of them. A schedule created from one view refreshes the others.
function ScheduleTab({ trips, drivers, conductors, onRefresh, view, onViewChange, calendarFocus }) {
  const [reloadToken, setReloadToken] = useState(0)
  const refreshAll = useCallback(() => {
    onRefresh()
    setReloadToken((token) => token + 1)
  }, [onRefresh])
  const tripsState = useTripsTab({ trips, onRefresh: refreshAll })
  const views = viewsForRole('schedule', OPERATOR_ROLE)

  return (
    <>
      <SchedulePage
        views={views}
        view={view}
        onViewChange={onViewChange}
        onCreate={() => { tripsState.setShowModal(true); tripsState.setMsg('') }}
      >
        {(active) => (
          <>
            {tripsState.msg && <p className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-800">{tripsState.msg}</p>}
            {active === 'calendar' && <StaffCalendar key={calendarFocus || 'today'} service={OperatorService} initialDate={calendarFocus} refreshKey={reloadToken} />}
            {active === 'blocks' && <ShiftBlocksView reloadToken={reloadToken} />}
            {active === 'trips' && <TripsTab drivers={drivers} conductors={conductors} onRefresh={refreshAll} tripsState={tripsState} />}
          </>
        )}
      </SchedulePage>
      <ScheduleServiceModal state={tripsState} drivers={drivers} conductors={conductors} />
    </>
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
            <option value="adherence">Route Adherence</option>
            <option value="occupancy">Occupancy Trends</option>
            <option value="daily">Daily Summary</option>
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
  // The day the Calendar page opens on when reached from the dashboard widget (null = today).
  const [calendarFocus, setCalendarFocus] = useState(null)
  const {
    activeTab, setActiveTab,
    view, setView,
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
        {/* w-0 min-w-full: a wide table inside a page must scroll in its card, not widen the whole portal column. */}
        <div className="w-0 min-w-full">
        <div className="mb-4 flex justify-end">
          <NotificationBell />
        </div>
        {activeTab === 'dashboard'  && (
          <OperatorDashboardPage
            trips={trips}
            drivers={drivers}
            conductors={conductors}
            fleets={fleets}
            topSlot={<TripRequestsPanel onDecided={loadFull} />}
            onRefresh={loadFull}
            onOpenCalendar={(date) => { setCalendarFocus(date); setActiveTab('schedule', 'calendar') }}
            onOpenSchedule={() => setActiveTab('schedule')}
          />
        )}
        {activeTab === 'schedule'   && (
          <ScheduleTab
            trips={trips}
            drivers={drivers}
            conductors={conductors}
            onRefresh={loadFull}
            view={view}
            onViewChange={setView}
            calendarFocus={calendarFocus}
          />
        )}
        {activeTab === 'staffs'     && (
          <StaffDirectoryTab drivers={drivers} conductors={conductors} onRefresh={loadFull} onCreateAccount={handleCreateAccount} />
        )}
        {activeTab === 'fleets'     && <FleetsPage fleets={fleets} routes={routes} trips={trips} onRefresh={loadFull} />}
        {activeTab === 'routes'     && <RoutesTab routes={routes} stops={stops} trips={trips} onRefresh={loadFull} />}
        {activeTab === 'finance'    && <FinancePage views={viewsForRole('finance', OPERATOR_ROLE)} view={view} onViewChange={setView} />}
        {activeTab === 'reports'    && <ReportsTab fleets={fleets} trips={trips} routes={routes} />}
        {activeTab === 'account'    && <AccountTab profile={profile} />}
        </div>
    </StaffPortalLayout>
  )
}




