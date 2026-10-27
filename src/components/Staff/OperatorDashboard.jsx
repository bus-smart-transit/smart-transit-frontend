import { useState, useEffect, useCallback } from 'react'
import StaffPortalLayout from './StaffPortalLayout'
import OperatorDashboardPage from './Operator/OperatorDashboardPage'
import StaffRoster from './Operator/StaffRoster'
import NotificationGroupList from './NotificationGroupList'
import { groupNotifications } from '../../utils/notificationGroups'
import FleetsPage from './Operator/FleetsPage'
import RoutesPage from './Operator/RoutesPage'
import StaffCalendar from './StaffCalendar'
import { ModalShell } from '../ui/Modal'
import OperatorReportsPage from './OperatorReportsPage'
import OperatorService from '../../api/StaffService/OperatorService'
import useDateDrivers from '../../api/hooks/Staff/useDateDrivers'
import { getBookingWindow } from '../../services/bookingService'
import { bookingWindowWarning } from '../../utils/bookingQuery'
import { parseAppDate, getBusinessToday, debugLogBusinessTime } from '../../utils/dates'
import { useOperatorDashboardData, useNotificationBell, useTripRequests, useTripsTab } from '../../api/hooks/Staff/useOperatorDashboard'
import RunInfoChips from '../ui/RunInfoChips'
import { CancelTripModal, TicketResolutionQueue } from './TripCancellationsPanel'
import LegTimeSuggestion from './LegTimeSuggestion'
import { addLeg, removeLastLeg } from '../../utils/legPlanning'
import ScheduleRangePreview from './Schedule/ScheduleRangePreview'
import CrewShiftTimes from './Operator/CrewShiftTimes'
import { isRangeSchedule, rangeDayCount } from '../../utils/scheduleRange'
import ProfilePage from '../Account/ProfilePage'
import SchedulePage from './Schedule/SchedulePage'
import ShiftBlocksView from './Schedule/ShiftBlocksView'
import FinancePage from './Finance/FinancePage'
import { OPERATOR_ROLE, navForRole, viewsForRole } from '../../utils/operatorNav'
import {
  LayoutDashboard, Bus, MapPin, PieChart, Users, Settings, Wallet, CalendarDays,
  Plus, Eye, RefreshCw,
  X, Loader2, AlertTriangle, Bell,
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

const OPERATOR_NOTIFICATION_FIELDS = { id: (n) => n.id, text: (n) => n.message }

// 2026-10-27: in the sidebar beside the profile (dark background), so its button is styled for it.
function NotificationBell() {
  const {
    open, setOpen,
    notifications,
    unreadCount,
    loadingNotifications,
    handleMarkRead,
    handleMarkGroupRead,
    handleMarkAllRead,
  } = useNotificationBell()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-slate-200 transition hover:bg-white/20 hover:text-white"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
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
              <p className="py-6 text-center text-sm text-slate-400">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No notifications yet.</p>
            ) : (
              // 2026-10-27: notifications of the same kind are one group (utils/notificationGroups).
              <NotificationGroupList
                groups={groupNotifications(notifications, OPERATOR_NOTIFICATION_FIELDS)}
                fields={OPERATOR_NOTIFICATION_FIELDS}
                onMarkRead={(ids) => (ids.length === 1 ? handleMarkRead(ids[0]) : handleMarkGroupRead(ids))}
              />
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

function TripRequestsPanel({ onDecided, showEmpty = false }) {
  const { requests, busyId, error, loading, decide } = useTripRequests(onDecided)
  if (!showEmpty && requests.length === 0 && !error) return null

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-sm font-bold text-amber-800">For Approval ({requests.length})</h2>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {loading && requests.length === 0 ? <p className="mt-3 text-sm text-slate-600">Loading approval requests...</p>
        : requests.length === 0 ? <p className="mt-3 text-sm text-slate-600">No pending approval requests.</p>
          : <ul className="mt-3 space-y-2">
        {requests.map((r) => {
          const route = r.trip?.fleet_route?.route
          const staffName = r.staff?.user?.name || r.staff?.name || 'Staff'
          const reason = r.reason_text || REQUEST_REASON_LABELS[r.reason_code] || 'No reason given'
          return (
            <li key={r.id} className="flex flex-col gap-2 rounded-xl border border-amber-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                <p className="font-semibold text-slate-900">{staffName} <span className="font-normal text-slate-500">({r.role})</span></p>
                <p className="text-xs text-slate-600">{route?.origin || '-'} to {route?.destination || '-'} · {r.trip?.trip_date}</p>
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
          </ul>}
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
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500">
            <option value="all">All roles</option>
            <option value="driver">Driver</option>
            <option value="conductor">Chauffeur</option>
          </select>
          <button type="button" onClick={onRefresh} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button type="button" onClick={() => { setShowModal(true); setMsg('') }} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
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
                <option value="conductor">Chauffeur</option>
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

// Batch 30: the create form behind the one "+ Schedule" button of the Schedule page (it was inside the Trips view). It
// is the same form and the same handler (useTripsTab); only its place changed, so it opens from any Schedule view.
function ScheduleServiceModal({ state, drivers, conductors }) {
  const { showModal, form, setForm, saving, msg, fleetRoutes, handleSchedule, rangePreview, rangeResult, confirmRange, closeScheduleModal } = state
  const multiLeg = form.trip_type === 'round_trip'
  const rangeMode = isRangeSchedule(form)
  const rangeDays = rangeDayCount(form.trip_date, form.to_date)
  const [bookingWindow, setBookingWindow] = useState(null)
  const { drivers: dateDrivers, loading: loadingDateDrivers, error: dateDriversError } = useDateDrivers(showModal && form.trip_date ? form.trip_date : '', drivers)
  useEffect(() => {
    if (!showModal) return undefined
    let cancelled = false
    getBookingWindow().then((w) => { if (!cancelled) setBookingWindow(w) }).catch(() => { if (!cancelled) setBookingWindow(null) })
    return () => { cancelled = true }
  }, [showModal])

  useEffect(() => {
    if (form.driver_id && !dateDrivers.some((driver) => String(getStaffCompanyUserId(driver)) === String(form.driver_id))) {
      setForm((previous) => ({ ...previous, driver_id: '' }))
    }
  }, [dateDrivers, form.driver_id, setForm])

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

  if (rangeResult) {
    return (
      <Modal title="Schedule Service" onClose={closeScheduleModal}>
        <ScheduleRangePreview result={rangeResult} onDone={closeScheduleModal} />
      </Modal>
    )
  }

  return (    <Modal title="Schedule Service" onClose={closeScheduleModal}>
      <form className="space-y-4" onSubmit={handleSchedule}>
        <Field label="Fleet Route" required>
          <select value={form.fleet_route_id} onChange={e => setForm(p => ({...p, fleet_route_id: e.target.value}))} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">Select a fleet route...</option>
            {fleetRoutes.map(fr => (
              <option key={fr.fleet_route_id} value={fr.fleet_route_id}>{fr.fleet?.plate_number} - {fr.route?.route_name}</option>
            ))}
          </select>
        </Field>
        {multiLeg ? (
          <div className="grid grid-cols-2 gap-2">
            {/* Phase B (§4.13): the same block on every day From..To; a To date equal to From (or empty) is one day. */}
            <Field label="From" type="date" value={form.trip_date} onChange={e => setForm(p => ({...p, trip_date: e.target.value}))} required hint={bookingWindowWarning(form.trip_date, bookingWindow)} />
            <Field label="To (optional)">
              <input
                type="date"
                aria-label="To"
                value={form.to_date || ''}
                min={form.trip_date || undefined}
                onChange={e => setForm(p => ({ ...p, to_date: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
              />
              {rangeDays > 1 && <p className="mt-1 text-xs text-slate-500">{rangeDays} days. You will see each day before anything is saved.</p>}
            </Field>
          </div>
        ) : (
          <Field label="Trip Date" type="date" value={form.trip_date} onChange={e => setForm(p => ({...p, trip_date: e.target.value}))} required hint={bookingWindowWarning(form.trip_date, bookingWindow)} />
        )}
        <Field label="Schedule" required>
          <select value={form.trip_type} onChange={e => setForm(p => ({ ...p, trip_type: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500">
            <option value="one_way">Single Departure</option>
            <option value="round_trip">Multi-Leg Schedule</option>
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
            <Field label="Notes (optional)" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Any notes..." />
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
            {/* 2026-10-27 (§4.2): no fixed number of legs; Suggest times works out how many fit. */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, leg_departure_times: addLeg(Array.isArray(prev.leg_departure_times) ? prev.leg_departure_times : defaultLegTimesByBlock[prev.block_type] || defaultLegTimesByBlock.morning) }))}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-100"
              >
                Add a leg
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, leg_departure_times: removeLastLeg(Array.isArray(prev.leg_departure_times) ? prev.leg_departure_times : defaultLegTimesByBlock[prev.block_type] || defaultLegTimesByBlock.morning) }))}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-100"
              >
                Remove the last leg
              </button>
            </div>
            <LegTimeSuggestion
              fleetRouteId={form.fleet_route_id}
              date={form.trip_date}
              firstTime={(Array.isArray(form.leg_departure_times) ? form.leg_departure_times : defaultLegTimesByBlock[form.block_type] || defaultLegTimesByBlock.morning)[0]}
              serviceType={form.service_type || 'regular'}
              onApply={(times) => setForm((prev) => ({ ...prev, leg_departure_times: times }))}
            />
          </>
        )}
        <Field label="Driver" required>
          <select value={form.driver_id} onChange={e => setForm(p => ({ ...p, driver_id: e.target.value }))} required disabled={loadingDateDrivers || Boolean(dateDriversError)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60">
            <option value="">Select a driver...</option>
            {dateDrivers.map(d => (
              <option key={getStaffCompanyUserId(d)} value={getStaffCompanyUserId(d)}>
                {getStaffFullName(d) || getStaffUsername(d)} ({getStaffEmail(d)})
              </option>
            ))}
          </select>
        </Field>
        {loadingDateDrivers && <p role="status" className="text-xs text-slate-500">Checking driver availability...</p>}
        {dateDriversError && <p role="alert" className="text-xs text-rose-700">{dateDriversError}</p>}
        <Field label="Chauffeur" required>
          <select value={form.conductor_id} onChange={e => setForm(p => ({ ...p, conductor_id: e.target.value }))} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">Select a chauffeur...</option>
            {conductors.map(c => (
              <option key={getStaffCompanyUserId(c)} value={getStaffCompanyUserId(c)}>
                {getStaffFullName(c) || getStaffUsername(c)} ({getStaffEmail(c)})
              </option>
            ))}
          </select>
        </Field>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        {rangeMode && <ScheduleRangePreview preview={rangePreview} saving={saving} onConfirm={confirmRange} />}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={closeScheduleModal} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving || loadingDateDrivers || Boolean(dateDriversError)} className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}{rangeMode ? (rangePreview ? 'Preview again' : 'Preview days') : 'Schedule'}
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
    visibleTripsMeta,
    loadingMoreTrips,
    loadMoreTrips,
    handleAssign,
    handleAction,
    handleConfirmedComplete,
    handleStatusOverride,
    loadTripGpsHistory,
  } = tripsState
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelNotice, setCancelNotice] = useState('')
  const { drivers: dateDrivers, loading: loadingDateDrivers, error: dateDriversError } = useDateDrivers(
    assignModal?.type === 'driver' ? String(assignModal.trip?.trip_date || '').slice(0, 10) : '',
    drivers,
  )

  useEffect(() => {
    if (assignModal?.type === 'driver' && assignId && !dateDrivers.some((driver) => String(getStaffCompanyUserId(driver)) === String(assignId))) {
      setAssignId('')
    }
  }, [assignId, assignModal?.type, dateDrivers, setAssignId])

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
                  {['ID','Date','Departure','Route','Fleet','Driver','Chauffeur','Status','Actions'].map(h => (
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
                        <td className="px-4 py-3 text-slate-700">{t.fleet_route?.fleet?.plate_number || '-'} <RunInfoChips runPattern={t.run_info?.run_pattern} service={t.run_info?.service} serviceType={t.service_type} showRunPattern /></td>
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

      {visibleTripsMeta.current_page < visibleTripsMeta.last_page && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void loadMoreTrips()}
            disabled={loadingMoreTrips}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {loadingMoreTrips ? 'Loading...' : `Load more trips (${visibleTrips.length} of ${visibleTripsMeta.total})`}
          </button>
        </div>
      )}


      {cancelNotice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{cancelNotice}</p>}
      <TicketResolutionQueue service={OperatorService} />
      {cancelTarget && (
        <CancelTripModal trip={cancelTarget} service={OperatorService} onClose={() => setCancelTarget(null)} onDone={(text) => { setCancelNotice(text); onRefresh() }} />
      )}

      {assignModal && (
        <Modal title={`Assign ${assignModal.type} to Trip #${assignModal.trip.trip_id}`} onClose={() => setAssignModal(null)}>
          <form className="space-y-4" onSubmit={handleAssign}>
            <Field label={`Select ${assignModal.type}`} required>
              <select value={assignId} onChange={e => setAssignId(e.target.value)} required disabled={assignModal.type === 'driver' && (loadingDateDrivers || Boolean(dateDriversError))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60">
                <option value="">Choose...</option>
                {(assignModal.type === 'driver' ? dateDrivers : conductors).map(p => (
                  <option key={getStaffCompanyUserId(p)} value={getStaffCompanyUserId(p)}>{getStaffFullName(p) || getStaffUsername(p)} ({getStaffEmail(p)})</option>
                ))}
              </select>
            </Field>
            {assignModal.type === 'driver' && loadingDateDrivers && <p role="status" className="text-xs text-slate-500">Checking driver availability...</p>}
            {assignModal.type === 'driver' && dateDriversError && <p role="alert" className="text-xs text-rose-700">{dateDriversError}</p>}
            {msg && <p className="text-sm text-red-600">{msg}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAssignModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving || (assignModal.type === 'driver' && (loadingDateDrivers || Boolean(dateDriversError)))} className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
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
              {[['Date', fmtDate(selectedTrip.trip_date)],['Status', selectedTrip.status],['Route', selectedTrip.fleet_route?.route?.route_name],['Fleet', selectedTrip.fleet_route?.fleet?.plate_number],['Driver', getStaffFullName(selectedTrip.driver) || selectedTrip.driver?.user?.email || 'Unassigned'],['Chauffeur', getStaffFullName(selectedTrip.conductor) || selectedTrip.conductor?.user?.email || 'Unassigned'],['Revenue', fmt(selectedTrip.total_revenue)]].map(([label, value]) => (
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
                  {statusOverrideSaving ? 'Updating...' : 'Complete anyway'}
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
            {active === 'requests' && <TripRequestsPanel onDecided={refreshAll} showEmpty />}
          </>
        )}
      </SchedulePage>
      <ScheduleServiceModal state={tripsState} drivers={drivers} conductors={conductors} />
    </>
  )
}

function ReportsTab({ fleets }) {
  return <OperatorReportsPage fleets={fleets} />
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
        <div className="flex items-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading dashboard...</div>
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
      profileAction={<NotificationBell />}
    >
        {/* w-0 min-w-full: a wide table inside a page must scroll in its card, not widen the whole portal column. */}
        <div className="w-0 min-w-full">
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
          <div className="space-y-4">
            <StaffRoster drivers={drivers} conductors={conductors} fleets={fleets} />
            <StaffDirectoryTab drivers={drivers} conductors={conductors} onRefresh={loadFull} onCreateAccount={handleCreateAccount} />
            <CrewShiftTimes />
          </div>
        )}
        {activeTab === 'fleets'     && <FleetsPage fleets={fleets} routes={routes} trips={trips} onRefresh={loadFull} />}
        {activeTab === 'routes'     && <RoutesPage routes={routes} stops={stops} trips={trips} fleets={fleets} onRefresh={loadFull} onOpenSchedule={() => setActiveTab('schedule')} onOpenFleets={() => setActiveTab('fleets')} />}
        {activeTab === 'finance'    && <FinancePage views={viewsForRole('finance', OPERATOR_ROLE)} view={view} onViewChange={setView} />}
        {activeTab === 'reports'    && <ReportsTab fleets={fleets} />}
        {activeTab === 'account'    && <ProfilePage role="operator" profile={profile} loading={loading} onSignOut={handleLogout} />}
        </div>
    </StaffPortalLayout>
  )
}




