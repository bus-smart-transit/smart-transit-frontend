import { useState } from 'react';
import {
  AlertTriangle,
  Bus,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Gauge,
  KeyRound,
  RefreshCw,
  TrendingUp,
  User,
} from 'lucide-react';
import PairingScreen from './PairingScreen';
import StaffPortalLayout from './StaffPortalLayout';
import DeclineTripModal from './DeclineTripModal';
import CalendarSummaryStrip from './CalendarSummaryStrip';
import DashboardCalendar from './DashboardCalendar';
import { ModalShell } from '../ui/Modal';
import StaffCalendar from './StaffCalendar';
import DriverNavigationMap from './DriverNavigationMap';
import QrImage from '../Passenger/Ticket/QrImage';
import RequestedStopRow from './RequestedStopRow';
import { groupRequestedStops } from '../../utils/requestedStops';
import NotificationBellButton from './NotificationBellButton';
import { useDriverPairing, useDriverDashboardData } from '../../api/hooks/Staff/useDriverDashboard';
import { getBusinessTodayLabel } from '../../utils/dates';
import { deriveTripDurationLabel, deriveTripStatus } from '../../utils/tripStatus';
import { FOR_APPROVAL_LABEL, canRespondToAssignment, getAssignmentRequestStatus, isForApproval } from '../../utils/assignmentRequest';
import DriverService from '../../api/StaffService/DriverService';

const STATUS_COLOR = {
  scheduled: '#153a6b',
  delayed: '#e11d48',
  boarding: '#3b82f6',
  departed: '#f59e0b',
  'in-progress': '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

// Batch 19 Part A: consolidated sidebar. "Assigned Routes" folds into
// Dashboard (assigned-route/schedule/vehicle data belongs on the landing
// view per Part B); Calendar + Schedule merge into one Schedule view;
// Journey/Navigation/Traffic Alerts/Trip Status/Shift Blocks merge into
// Active Trip (Shift Blocks is live operational state, not a planning
// view, so it groups here rather than with Schedule). Daily PIN gets its
// own item under Preferences & Utilities, extracted out of Trip Status.
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: Gauge },
  { key: 'activeTrip', label: 'Active Trip', icon: Bus },
  { key: 'schedule', label: 'Schedule', icon: CalendarDays },
  { key: 'earnings', label: 'Earnings', icon: TrendingUp },
  { key: 'pin', label: 'Daily PIN', icon: KeyRound },
  { key: 'account', label: 'Account', icon: User },
];

const formatDateTime = (value) => {
  if (!value) return '-';
  const str = String(value);
  // YYYY-MM-DD with no time — parsed as UTC midnight by the spec, which
  // shifts the displayed date/time by the user's UTC offset (e.g. UTC+2
  // shows 02:00 instead of 00:00). Append T00:00 so it is treated as local
  // time and show only the date since no meaningful time was stored.
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(str);
  const date = new Date(isDateOnly ? str + 'T00:00' : str);
  if (Number.isNaN(date.getTime())) return '-';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  if (isDateOnly) return `${yyyy}/${mm}/${dd}`;
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} - ${hh}:${min}`;
};

const toCompactTime = (value) => {
  if (!value) return '';
  const str = String(value).trim();
  const hhmmss = str.match(/^(\d{2}:\d{2})(?::\d{2})?$/);
  if (hhmmss) return hhmmss[1];
  return str;
};

const formatDateOnly = (value) => {
  if (!value) return '-';
  const str = String(value);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}/${match[2]}/${match[3]}`;
  return formatDateTime(value);
};

const formatTripSchedule = (tripLike) => {
  if (!tripLike) return '-';
  const dateLabel = formatDateOnly(tripLike?.trip_date);
  // Batch 10 fix (Issue #2) applied here too: bind to the trip's actual
  // departure_time, not fleet_route.start_time/end_time — that's the
  // fleet route's general daily operating-hours window (e.g. 05:00-21:00),
  // not this specific trip's scheduled departure time.
  const departureTime = toCompactTime(tripLike?.departure_time || tripLike?.fleet_route?.start_time);
  if (departureTime) return `${dateLabel} - ${departureTime}`;
  return dateLabel;
};

const resolveDriverHeaderBadge = ({
  pairingLoading,
  isPaired,
  hasTodayAssignedTrip,
  forApproval,
  hasOpenShift,
  isAvailable,
  hasActiveTrip,
  gpsActive,
  tripStatus,
}) => {
  if (pairingLoading) return { label: 'Checking pairing', tone: 'border-slate-200 bg-slate-50 text-slate-600' };
  if (!isPaired) return { label: 'Pairing required', tone: 'border-amber-200 bg-amber-50 text-amber-700' };
  if (!hasTodayAssignedTrip) return { label: 'No assigned trip', tone: 'border-slate-200 bg-slate-50 text-slate-600' };
  // C6: assignment-level status, shown through this single badge (D6).
  if (forApproval) return { label: FOR_APPROVAL_LABEL, tone: 'border-amber-200 bg-amber-50 text-amber-700' };
  if (!hasOpenShift) return { label: 'Shift not started', tone: 'border-sky-200 bg-sky-50 text-sky-700' };
  if (!isAvailable) return { label: 'Marked unavailable', tone: 'border-slate-200 bg-slate-50 text-slate-600' };
  const tripIsMoving = ['in_transit', 'at_stop'].includes(tripStatus?.key);
  if (hasActiveTrip && tripIsMoving && !gpsActive) return { label: 'GPS acquiring', tone: 'border-violet-200 bg-violet-50 text-violet-700' };
  // A1: once the trip is live the badge is the trip's own derived status.
  if (hasActiveTrip && tripStatus) return { label: tripStatus.label, tone: tripStatus.tone };
  return { label: 'Ready', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
};

export default function DriverDashboard() {
  const { pairing, refreshPairingStatus, handleLogout } = useDriverPairing();

  return (
    <DriverDashboardInner
      onLogout={handleLogout}
      pairing={pairing}
      refreshPairingStatus={refreshPairingStatus}
    />
  );
}

function DriverDashboardInner({ onLogout, pairing, refreshPairingStatus }) {
  // The day the full calendar opens on when reached from the dashboard widget (null = today).
  const [calendarFocus, setCalendarFocus] = useState(null);
  const {
    activeTab, setActiveTab,
    assignedTripFilter,
    profile,
    trip,
    stops,
    requestedStops,
    pin,
    showTripPin, setShowTripPin,
    pinInput, setPinInput,
    pinStatus, setPinStatus,
    earnings,
    shiftState,
    tripDetailsModal, setTripDetailsModal,
    loading,
    error,
    actionMsg, setActionMsg,
    actionInFlight,
    confirmComplete, setConfirmComplete,
    confirmDecline, setConfirmDecline,
    declineErrors, setDeclineErrors,
    declineSubmitting,
    twoFactorEnabled,
    saving2fa,
    msg2fa,
    isAvailable,
    gpsActive,
    trafficStatus,
    proximityAlert, setProximityAlert,
    isPaired,
    pairingReason,
    hasActiveTrip,
    hasTodayAssignedTrip,
    todayAssignedTrip,
    hasOpenShift,
    upcomingTrip,
    showNoCurrentTripState,
    currentRoute,
    currentFleet,
    nextStop,
    filteredAssignedTrips,
    todayAssignedTrips,
    upcomingAssignedTrips,
    stopProgress,
    tripProgress,
    notifications,
    journeyStatusLabel,
    pageTitle,
    lastGpsRef,
    shiftBlocks,
    shiftBlockActionInFlight,
    handleAssignedTripFilterChange,
    loadData,
    loadEarnings,
    handleVerifyPin,
    handleAcknowledgeStop,
    handleTripAction,
    handleStartShift,
    handleConfirmedComplete,
    handleConfirmedDecline,
    handleAcceptTrip,
    handleConfirmShiftBlockTakeover,
    handleLogout,
    handleToggleTwoFactor,
  } = useDriverDashboardData({ onLogout, pairing });
  const openFullCalendar = (date) => {
    setCalendarFocus(date);
    setActiveTab('schedule');
  };
  const requestedGroups = groupRequestedStops(requestedStops);

  const derivedTripStatus = deriveTripStatus(trip || todayAssignedTrip);

  const headerBadge = resolveDriverHeaderBadge({
    pairingLoading: pairing.loading,
    isPaired,
    hasTodayAssignedTrip,
    forApproval: isForApproval(todayAssignedTrip, 'driver'),
    hasOpenShift,
    isAvailable,
    hasActiveTrip,
    gpsActive,
    tripStatus: derivedTripStatus,
  });

  const busRouteLabel = `${currentFleet?.plate_number || 'Fleet pending'} · ${currentRoute?.route_name || 'Route pending'}`;

  // B5: a driver never ends a shift (Chauffeur only); the driver's header
  // action is Start Shift, then End Trip once the trip is under way.
  const tripIsLive = ['departed', 'in-progress'].includes(String(trip?.status || '').toLowerCase());
  const shiftAction = hasOpenShift
    ? {
      label: 'End Trip',
      onClick: () => handleTripAction('complete'),
      disabled: actionInFlight || !isPaired || !tripIsLive,
      className: 'inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60',
    }
    : {
      label: 'Start Shift',
      onClick: handleStartShift,
      disabled: actionInFlight || !isPaired || !(hasActiveTrip || hasTodayAssignedTrip),
      className: 'inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 disabled:opacity-60',
    };

  return (
    <>
    <StaffPortalLayout
      brandLabel="Driver Portal"
      brandIcon={Bus}
      navItems={NAV_ITEMS}
      activeTab={activeTab}
      onTabChange={(key) => { setActiveTab(key); setActionMsg(''); }}
      profile={profile}
      profileRoleLabel="Driver"
      profileInitialFallback="D"
      onLogout={handleLogout}
    >
        <header className="crew-header mb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
            <p className="text-xs text-slate-500">
              {getBusinessTodayLabel()}{currentRoute?.origin && currentRoute?.destination ? ` — ${currentRoute.origin} → ${currentRoute.destination}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <span className="crew-chip">
              {busRouteLabel}
            </span>
            <span className={`crew-chip ${headerBadge.tone}`}>
              {headerBadge.label}
            </span>
            <button
              className={shiftAction.className}
              onClick={shiftAction.onClick}
              disabled={shiftAction.disabled}
              title={!isPaired && !hasOpenShift ? 'Pairing is required before starting shift.' : undefined}
            >
              {shiftAction.label}
            </button>
            <button
              className="crew-chip-button"
              onClick={loadData}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <NotificationBellButton service={DriverService} role="driver" />
          </div>
          </div>
        </header>

        {loading && <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Loading driver workspace...</div>}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {actionMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {actionMsg}
          </div>
        )}

        {/* ── Alighting proximity notification (Feature 4) ──────────────────── */}
        {proximityAlert && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-700 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>
                <strong>Approaching stop:</strong> {proximityAlert.stop_name}
                {' '}— {proximityAlert.distance_m} m away. Passengers may be alighting.
              </span>
            </div>
            <button
              className="shrink-0 text-xs text-amber-400 hover:text-amber-200"
              onClick={() => setProximityAlert(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {showNoCurrentTripState && (
          <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6">
            <h3 className="text-lg font-semibold text-slate-900">No Current Trip Available</h3>
            <p className="mt-2 text-sm text-slate-500">
              You currently do not have an active or same-day trip to operate.
            </p>
            {upcomingTrip ? (
              <p className="mt-3 text-sm text-sky-600">
                Upcoming trip: {upcomingTrip?.fleet_route?.route?.origin || '-'} to {upcomingTrip?.fleet_route?.route?.destination || '-'} on {formatTripSchedule(upcomingTrip)}.
              </p>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                No upcoming trip is assigned yet. Please check again later.
              </p>
            )}
            <button
              className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => setActiveTab('dashboard')}
            >
              View Assigned Trips
            </button>
          </section>
        )}

        {/* Batch 19 Part B: dashboard data (assigned route, schedule,
            vehicle) always displays — pairing only gates specific live
            actions (each already disabled individually below with a
            tooltip), not the whole tab. */}
        {!loading && activeTab === 'dashboard' && !isPaired && (
          <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">Pairing required for live shift actions</p>
            <p className="mt-1 text-xs text-amber-700">{pairingReason} Your assigned route, schedule, and vehicle info below stay visible — only shift/trip actions are disabled until paired.</p>
          </section>
        )}

        {!loading && activeTab === 'dashboard' && !showNoCurrentTripState && (
          <section className="staff-grid xl:grid-cols-4 md:grid-cols-2">
            {/* S1: consolidated current-trip card — was 4 separate cards
                (Today's Trip / Next Stop / Trip Progress / Journey Status)
                describing facets of the same trip; merged into one primary
                card. No data/logic changes — same bindings and nav actions. */}
            <article className="staff-card md:col-span-2 xl:col-span-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Today's Trip</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">{currentRoute?.route_name || `Route ${trip?.fleet_route_id ?? '-'}`}</h3>
                  <p className="mt-1 text-sm text-slate-500">{currentRoute?.origin || '-'} → {currentRoute?.destination || '-'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {trip?.status === 'completed' ? (
                    <CheckCircle2 className="h-6 w-6 text-teal-500" />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-amber-400">
                      <div className="h-2 w-2 rounded-full bg-amber-400" />
                    </div>
                  )}
                  {/* S3 (Batch 17): fall back to the today-assigned trip's
                      status so this reads e.g. "Scheduled" pre-shift instead
                      of the misleading "Idle" placeholder. */}
                  <span className="text-sm font-bold text-slate-900">{derivedTripStatus.key === 'unknown' ? 'Idle' : derivedTripStatus.label}</span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Next Stop</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{nextStop?.stop_name ?? nextStop?.name ?? 'No pending stop'}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Departs {formatTripSchedule(trip || todayAssignedTrip)}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Trip Progress</p>
                  <p className="font-data mt-1 text-2xl font-bold text-slate-900">{tripProgress}%</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${tripProgress}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {stopProgress.totalStops > 0
                      ? `${stopProgress.completedStops} of ${stopProgress.totalStops} Stops Completed — ${tripProgress}%`
                      : journeyStatusLabel}
                  </p>
                  {stopProgress.nextStopName && (
                    <p className="mt-1 text-xs text-slate-500">Next stop: {stopProgress.nextStopName}</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Journey Status</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{derivedTripStatus.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{trip?.status === 'completed' ? 'Journey completed' : 'Manage the trip via Quick Actions below'}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3">
                <button className="text-sm font-semibold text-teal-600 hover:text-teal-700" onClick={() => setActiveTab('activeTrip')}>View Active Trip →</button>
              </div>
            </article>

            <article className="staff-card md:col-span-2 xl:col-span-2">
              <h4 className="mb-3 text-base font-bold text-slate-900">Quick Actions</h4>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50" onClick={() => handleTripAction('boarding')} disabled={actionInFlight || !isPaired || !hasOpenShift || !['scheduled', 'delayed'].includes(String(trip?.status || '').toLowerCase())}>
                  ○ Start Boarding
                </button>
                <button className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50" onClick={() => handleTripAction('depart')} disabled={actionInFlight || !isPaired || !hasOpenShift || !['boarding', 'scheduled', 'delayed'].includes(String(trip?.status || '').toLowerCase())}>
                  ▶ Depart
                </button>
                <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={loadData}>
                  ↻ Receive Route Updates
                </button>
                <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50" onClick={() => handleTripAction('complete')} disabled={actionInFlight || !isPaired || !['departed', 'in-progress'].includes(trip?.status)}>
                  ■ End Trip
                </button>
              </div>
            </article>

            <article className="staff-card md:col-span-2 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Route health</p>
                  <h4 className="text-base font-bold text-slate-900">Traffic & ETA</h4>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-[0.15em] ${
                  trafficStatus.dataSource === 'fallback' || trafficStatus.level === 'unknown'
                    ? 'bg-slate-100 text-slate-700'
                    : trafficStatus.level === 'heavy'
                    ? 'bg-red-100 text-red-700'
                    : trafficStatus.level === 'moderate'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {trafficStatus.label}
                </span>
              </div>

              {trafficStatus.dataSource === 'fallback' && (
                <p className="mb-3 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
                  Live traffic provider is unavailable. ETA and delay are hidden until provider-backed data is available.
                </p>
              )}

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">ETA</p>
                  <p className="mt-2 font-data text-2xl font-bold text-slate-900">{trafficStatus.etaMinutes == null ? 'Unavailable' : `${trafficStatus.etaMinutes} min`}</p>
                  <p className="mt-1 text-xs text-slate-500">to next stop</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Delay</p>
                  <p className="mt-2 font-data text-2xl font-bold text-slate-900">{trafficStatus.delayMinutes == null ? 'Unavailable' : `${trafficStatus.delayMinutes} min`}</p>
                  <p className="mt-1 text-xs text-slate-500">route impact</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Advice</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800 leading-5">{trafficStatus.suggestion}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Next Stop</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800 leading-5">{nextStop?.stop_name ?? nextStop?.name ?? 'No pending stop'}</p>
                </div>
              </div>
            </article>

            <article className="staff-card md:col-span-2 xl:col-span-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900">Traffic Alerts</h4>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">{notifications.length} Active</span>
              </div>
              <div className="space-y-2">
                {notifications.slice(0, 3).map((notice, idx) => (
                  <div key={idx} className={`flex items-start justify-between gap-3 rounded-lg border bg-slate-50 px-3 py-2 ${
                    notice.tone === 'danger' ? 'border-red-200' : notice.tone === 'warn' ? 'border-amber-200' : 'border-teal-200'
                  }`}>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{notice.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{notice.note}</p>
                    </div>
                    <small className="shrink-0 text-xs text-slate-400">{notice.time}</small>
                  </div>
                ))}
              </div>
            </article>

            <article className="staff-card md:col-span-2 xl:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900">Quick Notifications</h4>
                <button className="text-xs font-medium text-teal-600 hover:text-teal-700">View All</button>
              </div>
              <div className="divide-y divide-slate-100">
                {notifications.map((notice, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                        notice.tone === 'danger' ? 'bg-red-500' : notice.tone === 'warn' ? 'bg-amber-400' : 'bg-teal-400'
                      }`} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{notice.title}</p>
                        <p className="text-xs text-slate-500">{notice.note}</p>
                      </div>
                    </div>
                    <small className="shrink-0 text-xs text-slate-400">{notice.time}</small>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {/* Batch 19 Part A: folded into Dashboard (was the standalone
            "Assigned Routes" nav item). Accept/decline never depended on
            pairing, so no gating needed here. */}
        {!loading && activeTab === 'dashboard' && (
          <section className="mt-4 staff-card">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900">Assigned Routes</h4>
              <div className="flex items-center gap-2">
                <label htmlFor="driver-assigned-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter</label>
                <select
                  id="driver-assigned-filter"
                  value={assignedTripFilter}
                  onChange={(event) => { void handleAssignedTripFilterChange(event.target.value); }}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
                >
                  <option value="all">All</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                </select>
                <span className="text-xs text-slate-400">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
            {filteredAssignedTrips.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">No trips match this filter.</div>
            ) : (
              <div className="space-y-5">
                <DriverTripTable title="Today's Assigned Trips" trips={todayAssignedTrips} onSelectTrip={setTripDetailsModal} onDeclineTrip={setConfirmDecline} onAcceptTrip={handleAcceptTrip} />
                <DriverTripTable title="Upcoming Trips" trips={upcomingAssignedTrips} onSelectTrip={setTripDetailsModal} onDeclineTrip={setConfirmDecline} onAcceptTrip={handleAcceptTrip} emptyMessage="No upcoming trips match this filter." />
              </div>
            )}
          </section>
        )}

        {/* C-2: the dashboard widget opens a day in a modal; the Schedule page is the full calendar. Both read the
            server's calendar endpoints, scoped to the signed-in Driver. */}
        {!loading && activeTab === 'schedule' && <CalendarSummaryStrip service={DriverService} className="mb-4" />}
        {!loading && activeTab === 'schedule' && (
          <StaffCalendar key={calendarFocus || 'today'} service={DriverService} initialDate={calendarFocus} />
        )}

        {!loading && activeTab === 'dashboard' && (
          <div className="mt-4 space-y-4">
            <CalendarSummaryStrip service={DriverService} />
            <DashboardCalendar service={DriverService} onOpenFull={openFullCalendar} />
          </div>
        )}

        {/* Batch 18: Shift Block Hand-off System. Independent of pairing —
            a scheduled block's takeover confirmation happens before any
            per-leg pairing is relevant. Batch 19 Part A: grouped under
            "Active Trip" (live operational state), not Schedule. */}
        {!loading && activeTab === 'activeTrip' && (
          <section className="staff-card">
            <h3 className="mb-4 text-base font-bold text-slate-900">My Shift Blocks</h3>
            {shiftBlocks.length === 0 ? (
              <p className="text-sm text-slate-500">No shift blocks assigned.</p>
            ) : (
              <div className="space-y-3">
                {shiftBlocks.map((block) => (
                  <div key={block.shift_block_id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 capitalize">{block.block_type} block — {block.scheduled_date}</p>
                        <p className="text-xs text-slate-500">{block.fleet?.plate_number || 'Fleet -'} · {block.legs?.length ?? 0} legs</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold uppercase" style={{ background: `${STATUS_COLOR[block.status === 'in_progress' ? 'in-progress' : block.status] || '#153a6b'}20`, color: STATUS_COLOR[block.status === 'in_progress' ? 'in-progress' : block.status] || '#153a6b' }}>
                          {block.status.replace('_', ' ')}
                        </span>
                        {block.status === 'scheduled' && (
                          <button
                            type="button"
                            onClick={() => handleConfirmShiftBlockTakeover(block.shift_block_id)}
                            disabled={shiftBlockActionInFlight}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Confirm Takeover
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {!loading && activeTab === 'activeTrip' && showNoCurrentTripState && upcomingTrip && (
          <section className="staff-grid lg:grid-cols-2">
            <article className="staff-card lg:col-span-2">
              <h4 className="mb-2 text-base font-semibold text-slate-900">Upcoming Route Preview</h4>
              <p className="mb-3 text-xs text-slate-500">
                This is your next assigned route map so you can prepare before your shift starts.
              </p>
              <DriverNavigationMap trip={upcomingTrip} stops={[]} lastGpsRef={lastGpsRef} />
            </article>
          </section>
        )}

        {!loading && activeTab === 'activeTrip' && !showNoCurrentTripState && (
          <section className="staff-grid">
            <article className="staff-card">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900">Trip Status</h4>
                <button
                  className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                  onClick={() => handleTripAction('complete')}
                  disabled={actionInFlight || !isPaired || !['departed', 'in-progress'].includes(trip?.status)}
                >
                  End Trip
                </button>
              </div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Current Trip Summary</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[{label:'Total Distance', value: `${stops[stops.length-1]?.distance_from_origin_km ?? 0} km`}, {label:'Trip Time', value: deriveTripDurationLabel(trip) ?? 'Not started'}, {label:'Total Stops', value: String(stops.length)}].map(({label, value}) => (
                  <div key={label} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 font-data text-lg font-bold text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">Trip Progress</span>
                  <span className="font-data font-bold text-slate-900">
                    {stopProgress.totalStops > 0
                      ? `${stopProgress.completedStops}/${stopProgress.totalStops} stops`
                      : `${tripProgress}%`}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${tripProgress}%` }} />
                </div>
                {stopProgress.nextStopName && (
                  <p className="mt-2 text-xs text-slate-500">Next stop: {stopProgress.nextStopName}</p>
                )}
              </div>
            </article>
          </section>
        )}

        {!loading && activeTab === 'activeTrip' && !showNoCurrentTripState && (
          <section className="staff-grid lg:grid-cols-2">
            <article className="staff-card">
              <h4 className="mb-3 text-base font-semibold text-slate-900">Route Navigation</h4>
              <DriverNavigationMap trip={trip} stops={stops} lastGpsRef={lastGpsRef} />
            </article>

            <article className="staff-card">
              <h4 className="mb-3 text-base font-semibold text-slate-900">Route Details</h4>
              {stops.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">No route details available.</div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-widest text-slate-500">Route Progress</p>
                      <p className="text-xs font-semibold text-slate-600">{stopProgress.completedStops} of {stopProgress.totalStops} Stops Completed — {stopProgress.progressPercent}%</p>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-cyan-400 to-sky-500 transition-all"
                        style={{ width: `${Math.max(0, Math.min(100, stopProgress.progressPercent))}%` }}
                      />
                    </div>
                    {stopProgress.nextStopName && (
                      <p className="mt-2 text-xs text-slate-500">Next stop: <span className="font-semibold text-slate-700">{stopProgress.nextStopName}</span></p>
                    )}
                  </div>

                  {requestedGroups.before.map((requested) => (
                    <RequestedStopRow key={`before-${requested.latitude},${requested.longitude}`} requested={requested} note="before the first stop" />
                  ))}

                  {stops.map((stop, idx) => {
                    const completed = Boolean(stop.is_acknowledged);
                    const requestedAfter = requestedGroups.after[stop.sequence_number ?? stop.stop_order ?? idx + 1] ?? [];
                    return (
                      <div key={stop.stop_id ?? idx} className="space-y-1.5">
                      <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${completed ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${completed ? 'border-emerald-400 text-emerald-700' : 'border-slate-300 text-slate-600'}`}>{idx + 1}</span>
                        <div>
                          <p className={`text-sm font-semibold ${completed ? 'text-emerald-700' : 'text-slate-900'}`}>{stop.stop_name ?? stop.name ?? `Stop ${idx + 1}`}</p>
                          <small className="font-data text-xs text-slate-500">{stop.distance_from_origin_km != null ? `${stop.distance_from_origin_km} km` : ''}</small>
                        </div>
                        {completed ? (
                          <span className="ml-auto text-xs font-semibold text-emerald-700">Reached</span>
                        ) : (
                          <button
                            className="ml-auto rounded-lg bg-sky-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => handleAcknowledgeStop(stop.stop_id)}
                            disabled={actionInFlight || !stop?.stop_id || !isPaired}
                            title={!isPaired ? 'Pairing is required to acknowledge stops.' : undefined}
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
                      {requestedAfter.map((requested) => (
                        <RequestedStopRow key={`${requested.latitude},${requested.longitude}`} requested={requested} />
                      ))}
                      </div>
                    );
                  })}
                  {requestedGroups.unknown.map((requested) => (
                    <RequestedStopRow key={`unknown-${requested.latitude},${requested.longitude}`} requested={requested} note="position on the route unknown" />
                  ))}
                </div>
              )}
            </article>
          </section>
        )}

        {!loading && activeTab === 'earnings' && !showNoCurrentTripState && (
          <section className="staff-grid md:grid-cols-2 xl:grid-cols-3">
            <article className="staff-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Fare Collected</p>
              <h3 className="font-data mt-2 text-2xl font-bold text-slate-900">
                ₱{earnings ? Number(earnings.total_fare).toFixed(2) : '0.00'}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{earnings?.passenger_count ?? 0} passengers</p>
            </article>
            <article className="staff-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cash Payments</p>
              <h3 className="font-data mt-2 text-2xl font-bold text-teal-600">
                ₱{earnings ? Number(earnings.onsite_amount).toFixed(2) : '0.00'}
              </h3>
            </article>
            <article className="staff-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Digital Payments</p>
              <h3 className="font-data mt-2 text-2xl font-bold text-blue-600">
                ₱{earnings ? Number(earnings.online_amount).toFixed(2) : '0.00'}
              </h3>
            </article>
            <article className="staff-card md:col-span-2 xl:col-span-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Average Fare</p>
                  <p className="font-data mt-1 text-lg font-semibold text-slate-900">
                    PHP {earnings ? Number(earnings.average_fare).toFixed(2) : '—'} per passenger
                  </p>
                </div>
                <button
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={loadEarnings}
                >
                  <RefreshCw className="inline h-3.5 w-3.5 mr-1" />Refresh
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Computed server-side from verified payment records. Only boarded/alighted passengers are counted.
              </p>
            </article>
          </section>
        )}

        {/* Batch 20 Item 3: pairing action moved to the Daily PIN page
            (pairing is driven by PIN/QR generation, so that's its
            semantically correct home) — Active Trip only shows a
            reminder banner + keeps its data/actions individually gated,
            no longer embeds the full PairingScreen widget here. */}
        {!loading && activeTab === 'activeTrip' && !isPaired && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">Not paired with your conductor yet</p>
            <p className="mt-1 text-sm text-amber-700">Live actions (start boarding, depart, end trip, acknowledge stops) stay disabled until pairing is complete. Trip data below stays visible.</p>
            <button
              type="button"
              onClick={() => setActiveTab('pin')}
              className="mt-3 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-200"
            >
              Go to Daily PIN to pair →
            </button>
          </section>
        )}

        {/* Batch 19 Part A: Daily PIN extracted out to its own nav item
            (see 'pin' tab below), no longer bundled inside Trip Status. */}
        {!loading && activeTab === 'pin' && (
          <section className="max-w-xl space-y-4">
            {/* Batch 20 Item 3: pairing lives here now, not on Active Trip. */}
            {!isPaired && (
              <PairingScreen
                role="driver"
                paired={isPaired}
                pairingReason={pairingReason}
                onPaired={() => void refreshPairingStatus()}
              />
            )}
            <article className="staff-card staff-card-roomy">
              <h4 className="mb-3 text-base font-semibold text-slate-900">Daily PIN Verification</h4>
              {!isPaired && (
                <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{pairingReason}</p>
              )}
              {pin && (
                <>
                  <div className="font-data mb-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-2xl font-bold tracking-[0.2em] text-slate-900">
                    {showTripPin ? pin.pin_code : '••••••'}
                  </div>
                  <div className="mb-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowTripPin((prev) => !prev)}
                      className="rounded-xl border border-slate-200 bg-white p-1 transition hover:scale-[1.01]"
                      title="Tap QR to show or hide PIN"
                    >
                      <QrImage content={pin.pin_code} alt="PIN QR code" size={280} className="h-36 w-36" />
                    </button>
                  </div>
                  <p className="mb-3 text-center text-xs text-slate-500">Tap QR to {showTripPin ? 'hide' : 'show'} PIN code</p>
                  <div className="mb-3 space-y-2 text-xs">
                    {pin.fleet_plate_number && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Fleet</span>
                        <strong className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-sky-700">{pin.fleet_plate_number}</strong>
                      </div>
                    )}
                    {pin.route_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Route</span>
                        <strong className="text-slate-700">{pin.route_name}</strong>
                      </div>
                    )}
                    <div className="flex items-center justify-between"><span className="text-slate-500">Driver Verified</span><strong className={pin.driver_verified_at ? 'text-emerald-600' : 'text-slate-400'}>{pin.driver_verified_at ? '✓ Yes' : 'Not yet'}</strong></div>
                    <div className="flex items-center justify-between"><span className="text-slate-500">Conductor Verified</span><strong className={pin.conductor_verified_at ? 'text-emerald-600' : 'text-slate-400'}>{pin.conductor_verified_at ? '✓ Yes' : 'Not yet'}</strong></div>
                  </div>
                  {pin.both_verified && (
                    <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700">
                      ✓ Both verified — trip is cleared for departure
                    </div>
                  )}
                </>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit PIN"
                  value={pinInput}
                  onChange={(e) => { setPinInput(e.target.value); setPinStatus(''); }}
                  className="font-data h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400"
                />
                <button className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600" onClick={handleVerifyPin}>Verify</button>
              </div>
              {pinStatus && <p className={`mt-3 text-sm ${pinStatus === 'PIN verified successfully.' ? 'text-emerald-600' : 'text-red-600'}`}>{pinStatus}</p>}
            </article>
          </section>
        )}

        {!loading && activeTab === 'account' && (
          <section className="staff-grid lg:grid-cols-2">
            <article className="staff-card">
              <h4 className="mb-3 text-base font-semibold text-slate-900">Profile Information</h4>
              <div className="mb-4 flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-2xl font-bold text-white">
                  {(profile?.name || 'D')[0].toUpperCase()}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{profile?.name || 'Driver'}</h3>
                <p className="text-xs text-slate-500">Verified Driver</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-slate-500">Email</span><strong className="text-slate-900">{profile?.user?.email || profile?.email || '-'}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Driver ID</span><strong className="font-data text-slate-900">{profile?.company_user_id || '-'}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Status</span><strong className="text-emerald-600">Active</strong></div>
              </div>
            </article>

            <article className="staff-card">
              <h4 className="mb-3 text-base font-semibold text-slate-900">PIN and Trip Context</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-slate-500">Trip ID</span><strong className="font-data text-slate-900">{pin?.trip_id ?? trip?.trip_id ?? '-'}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Route</span><strong className="text-slate-900">{pin?.route_name || currentRoute?.route_name || '-'}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Fleet</span><strong className="font-data text-slate-900">{pin?.fleet_plate_number || currentFleet?.plate_number || '-'}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Date</span><strong className="font-data text-slate-900">{formatDateTime(pin?.pin_date || trip?.trip_date)}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Shift Started</span><strong className="font-data text-slate-900">{formatDateTime(shiftState?.latestShift?.started_at)}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Shift Ended</span><strong className="font-data text-slate-900">{formatDateTime(shiftState?.latestShift?.ended_at)}</strong></div>
              </div>
            </article>

            <article className="staff-card">
              <h4 className="mb-3 text-base font-semibold text-slate-900">Security & 2FA</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-700 font-medium">Two-Factor Authentication</p>
                    <p className="text-xs text-slate-500 mt-0.5">Require OTP verification on every login.</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" className="sr-only peer" checked={twoFactorEnabled}
                      onChange={(e) => handleToggleTwoFactor(e.target.checked)} disabled={saving2fa} />
                    <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-teal-500 peer-focus:ring-2 peer-focus:ring-teal-400 transition-colors after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>
                {msg2fa && <p className={`text-xs rounded px-2 py-1 ${msg2fa.toLowerCase().includes('fail') ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-700'}`}>{msg2fa}</p>}
              </div>
            </article>
          </section>
        )}
    </StaffPortalLayout>

      {/* ── End Trip Confirmation Modal ───────────────────────────────── */}
      {confirmComplete && (
        <ModalShell label="End trip" onClose={() => setConfirmComplete(false)} closeOnOverlay={false} overlayClassName="bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-bold text-slate-100">End Trip?</h3>
            <p className="mb-4 text-sm text-slate-400">This will finalize the trip and all stop/occupancy data. <strong className="text-amber-300">This cannot be undone.</strong></p>
            <dl className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-800 p-3 text-sm">
              <div><dt className="text-xs text-slate-500">Trip ID</dt><dd className="font-semibold text-slate-100">#{trip?.trip_id}</dd></div>
              <div><dt className="text-xs text-slate-500">Route</dt><dd className="font-semibold text-slate-100">{trip?.fleet_route?.route?.route_name || '-'}</dd></div>
            </dl>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmComplete(false)} className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button type="button" onClick={handleConfirmedComplete} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Yes, End Trip</button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* C6: decline request dialog, shared by Driver and Chauffeur */}
      {confirmDecline && (
        <DeclineTripModal
          key={confirmDecline.trip_id}
          trip={confirmDecline}
          scheduleLabel={formatTripSchedule(confirmDecline)}
          submitting={declineSubmitting}
          errors={declineErrors}
          onCancel={() => { setConfirmDecline(null); setDeclineErrors({}); }}
          onSubmit={handleConfirmedDecline}
        />
      )}

      {/* ── Suggestion: Trip details modal ───────────────────────────────── */}
      {tripDetailsModal && (() => {
        const td = tripDetailsModal;
        const route = td.fleet_route?.route || {};
        const fleet = td.fleet_route?.fleet || {};
        return (
          <ModalShell label="Trip details" onClose={() => setTripDetailsModal(null)} zClass="z-[100]" overlayClassName="bg-black/70">
            <section
              className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-200"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Trip Details</h3>
                  <p className="text-xs text-slate-500">RTE-{td.trip_id}</p>
                </div>
                <button type="button" onClick={() => setTripDetailsModal(null)} className="text-slate-500 hover:text-slate-300 text-lg leading-none">✕</button>
              </div>

              <div className="space-y-2 text-sm">
                {[
                  ['Route', `${route.origin || '—'} → ${route.destination || '—'}`],
                  ['Route name', route.route_name || '—'],
                  ['Date & time', formatDateTime(td.trip_date)],
                  ['Status', td.status],
                  ['Fleet', fleet.plate_number || '—'],
                  ['Fleet type', fleet.fleet_type || '—'],
                  ['Total capacity', fleet.capacity ?? '—'],
                  ['Seated remaining', td.current_seated_capacity ?? '—'],
                  ['Standing remaining', td.current_standing_capacity ?? '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-4 border-b border-slate-800 pb-2">
                    <span className="text-slate-500 capitalize">{k}</span>
                    <strong className="text-slate-100 capitalize text-right">{String(v)}</strong>
                  </div>
                ))}
              </div>
            </section>
          </ModalShell>
        );
      })()}
    </>
  );
}

function DriverTripTable({ title, trips, onSelectTrip, onDeclineTrip, onAcceptTrip, emptyMessage = 'No trips in this section.' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h5 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h5>
      {trips.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white">
          <table className="w-full min-w-175 text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-3 pr-4 pl-4">Route ID</th>
                <th className="py-3 pr-4">Route</th>
                <th className="py-3 pr-4">Departure Time</th>
                <th className="py-3 pr-4">Destination</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trips.map((item) => {
                // Batch 14: decline must be reachable from this list \u2014
                // today OR upcoming \u2014 regardless of pairing status.
                const canDecline = ['scheduled', 'delayed', 'boarding'].includes(String(item?.status || '').toLowerCase());
                return (
                  <tr key={item.trip_id} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => onSelectTrip(item)} title="Click for trip details">
                    <td className="py-3 pr-4 pl-4 font-data text-slate-500">RTE-{item.trip_id}</td>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{item.fleet_route?.route?.origin || '-'} → {item.fleet_route?.route?.destination || '-'}</td>
                    <td className="py-3 pr-4 font-data text-slate-600">{formatTripSchedule(item)}</td>
                    <td className="py-3 pr-4 text-slate-600">{item.fleet_route?.route?.destination || '-'}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: `${STATUS_COLOR[item.status] || '#153a6b'}20`, color: STATUS_COLOR[item.status] || '#153a6b' }}>
                        {(item.status || 'pending').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        {canDecline && canRespondToAssignment(item, 'driver') && (
                          <button
                            type="button"
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            onClick={(event) => { event.stopPropagation(); onAcceptTrip?.(item); }}
                          >
                            Accept
                          </button>
                        )}
                        {canDecline && canRespondToAssignment(item, 'driver') && (
                          <button
                            type="button"
                            className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                            onClick={(event) => { event.stopPropagation(); onDeclineTrip?.(item); }}
                          >
                            Decline
                          </button>
                        )}
                        {getAssignmentRequestStatus(item, 'driver') === 'for_approval' && (
                          <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">{FOR_APPROVAL_LABEL}</span>
                        )}
                        {getAssignmentRequestStatus(item, 'driver') === 'rejected' && (
                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600">Request rejected: please proceed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


