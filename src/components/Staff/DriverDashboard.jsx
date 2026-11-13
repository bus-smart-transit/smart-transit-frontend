import { driverEtaMinutes, placeInMinutes } from '../../utils/busEta'; // Batch 51 item 1: "{next stop} in n min"
import { useState } from 'react';
import {
  AlertTriangle,
  Bus,
  CalendarDays,
  CheckCircle2,
  Gauge,
  RefreshCw,
  User,
} from 'lucide-react';
import PairingScreen from './PairingScreen';
import StaffPortalLayout from './StaffPortalLayout';
import ProfilePage from '../Account/ProfilePage';
import FirstPasswordPrompt from '../Account/FirstPasswordPrompt';
import AssignmentSection from './AssignmentSection';
import MyScheduleList from './MyScheduleList';
import { driverTripActionReason } from '../../utils/actionReasons';
import CalendarSummaryStrip from './CalendarSummaryStrip';
import Modal, { ModalShell } from '../ui/Modal';
import CrewAlertCard from './CrewAlertCard';
import StaffCalendar from './StaffCalendar';
import DriverNavigationMap from './DriverNavigationMap';
import RequestedStopRow from './RequestedStopRow';
import { groupRequestedStops } from '../../utils/requestedStops';
import NotificationBellButton from './NotificationBellButton';
import NextStepCard from './Crew/NextStepCard';
import CrewTodayCard from './Crew/CrewTodayCard';
import TextSizeControl from './Crew/TextSizeControl';
import useCrewTextSize from '../../api/hooks/Staff/useCrewTextSize';
import { driverNextStep } from '../../utils/crewNextStep';
import { useDriverPairing, useDriverDashboardData } from '../../api/hooks/Staff/useDriverDashboard';
import { getBusinessTodayLabel } from '../../utils/dates';
import { isFinalStopAcknowledged, opensGate } from '../../utils/tripActionTiming';
import { placesLeft } from '../../utils/cashTicket';
import { useNow } from '../../api/hooks/useNow';
import { deriveTripDurationLabel, deriveTripStatus } from '../../utils/tripStatus';
import { FOR_APPROVAL_LABEL, isForApproval } from '../../utils/assignmentRequest';
import DriverService from '../../api/StaffService/DriverService';

import { SkeletonPage } from '../ui/Skeleton';
// Batch 19 Part A: consolidated sidebar. "Assigned Routes" folds into
// Dashboard (assigned-route/schedule/vehicle data belongs on the landing
// view per Part B); Calendar + Schedule merge into one Schedule view;
// Journey/Navigation/Traffic Alerts/Trip Status/Shift Blocks merge into
// Active Trip (Shift Blocks is live operational state, not a planning
// view, so it groups here rather than with Schedule). Daily PIN had its own
// item until Batch 45 Feature B moved it into the Dashboard's "Pair with crew" pop-up.
// Batch 61 (advisor): short labels for the phone's bottom bar.
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Home', icon: Gauge },
  { key: 'activeTrip', label: 'Trip', icon: Bus },
  { key: 'schedule', label: 'Schedule', icon: CalendarDays },
  // Batch 45 Feature B: the Daily PIN tab is now the "Pair with crew" pop-up on the Dashboard.
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
  if (hasActiveTrip && tripIsMoving && !gpsActive) return { label: 'Finding your location', tone: 'border-violet-200 bg-violet-50 text-violet-700' };
  // A1: once the trip is live the badge is the trip's own derived status.
  if (hasActiveTrip && tripStatus) return { label: tripStatus.label, tone: tripStatus.tone };
  return { label: 'Ready', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
};

function ActiveTripTrafficCard({ trafficStatus, nextStop }) {
  const unavailable = trafficStatus.dataSource === 'fallback';
  const badgeLabel = unavailable
    ? 'Unavailable'
    : trafficStatus.level === 'unknown'
      ? 'Travel time only'
      : trafficStatus.label;
  const badgeTone = unavailable || trafficStatus.level === 'unknown'
    ? 'bg-slate-100 text-slate-700'
    : trafficStatus.level === 'heavy'
      ? 'bg-red-100 text-red-700'
      : trafficStatus.level === 'moderate'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-emerald-100 text-emerald-700';

  return (
    <article className="staff-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Route conditions</p>
          <h4 className="text-base font-bold text-slate-900">Traffic to next stop</h4>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${badgeTone}`}>{badgeLabel}</span>
      </div>
      <p className="mb-3 text-xs font-medium text-slate-500">
        Measured segment: {trafficStatus.segmentLabel || `Current position to ${nextStop?.stop_name ?? nextStop?.name ?? 'next stop'}`}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ETA</p>
          <p className="mt-1 font-data text-lg font-bold text-slate-900">{driverEtaMinutes(trafficStatus, nextStop) == null ? <span className="text-sm">Not available</span> : `${driverEtaMinutes(trafficStatus, nextStop)} min`}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Extra time</p>
          <p className="mt-1 font-data text-lg font-bold text-slate-900">{trafficStatus.delayMinutes == null ? <span className="text-sm">Not available</span> : `${trafficStatus.delayMinutes} min`}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next stop</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{nextStop ? placeInMinutes(nextStop?.stop_name ?? nextStop?.name, driverEtaMinutes(trafficStatus, nextStop)) : 'No pending stop'}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-700">{trafficStatus.suggestion}</p>
      <p className="mt-2 text-xs text-slate-500">
        {trafficStatus.updatedAt
          ? `Provider updated ${new Date(trafficStatus.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | ${String(trafficStatus.dataSource || 'provider').toUpperCase()}`
          : 'No live provider timestamp'}
      </p>
    </article>
  );
}

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
  // The day the full calendar opens on (null = today). Batch 61: the Home calendar widget is gone, so it stays today.
  const [calendarFocus] = useState(null);
  const {
    activeTab, setActiveTab, pairingOpen, setPairingOpen,
    focusTripId, openTripFromNotification, dismissTripFocus,
    focusBlockId, assignments,
    assignedTrips,
    assignedTripFilter,
    profile,
    trip,
    stops,
    requestedStops,
    shiftState,
    tripDetailsModal, setTripDetailsModal,
    loading,
    error,
    actionMsg, setActionMsg,
    actionInFlight,
    confirmComplete, setConfirmComplete,
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
    stopProgress,
    tripProgress,
    pageTitle,
    lastGpsRef,
    shiftBlocks,
    handleAssignedTripFilterChange,
    loadData,
    handleAcknowledgeStop,
    handleTripAction,
    handleStartShift,
    handleEndShift,
    handleConfirmedComplete,
    handleLogout,
    handleToggleTwoFactor,
    availabilitySaving,
    handleToggleAvailability,
  } = useDriverDashboardData({ onLogout, pairing });
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


  // Header rule (one button): Start Shift, then End Trip while a leg is under way. A shift block is one
  // shift (Batch 27 Part 2, Task 1): between and after its legs the same button is End Shift, which the
  // server allows only once every leg is completed or cancelled (end_blocked_reason says why not).
  const tripIsLive = ['departed', 'in-progress'].includes(String(trip?.status || '').toLowerCase());
  // Phase A (§4.11): the server's opening times for this leg, checked against the clock every 15 seconds.
  const now = useNow(15000);
  const boardingGate = opensGate(trip?.action_timing?.boarding_opens_at, now, 'Start Boarding opens');
  const departGate = opensGate(trip?.action_timing?.departure_at, now, 'Depart opens');
  const finalStopDone = isFinalStopAcknowledged(stops);
  // Batch 29: the shift (and the pairing key) unlock only after the assignment is accepted.
  const needsAcceptance = Boolean(todayAssignedTrip) && !todayAssignedTrip.driver_accepted_at;
  const showEndShift = hasOpenShift && shiftState?.isBlockShift === true && !tripIsLive;
  // Batch 61 (advisor, 2026-11-13): the Home shows one big button, the next step (it replaces the header's shift button
  // and the four Quick Actions). The server still checks every action.
  const textSize = useCrewTextSize();
  const nextStopRow = stops.find((stop) => !stop?.is_acknowledged) ?? null;
  const step = driverNextStep({
    hasWork: hasActiveTrip || hasTodayAssignedTrip,
    forApproval: isForApproval(todayAssignedTrip, 'driver'),
    needsAcceptance,
    isPaired,
    hasOpenShift,
    showEndShift,
    endBlockedReason: shiftState?.endBlockedReason || '',
    tripStatus: trip?.status,
    boardingGate,
    departGate,
    finalStopDone,
    nextStopName: nextStopRow?.stop_name ?? nextStopRow?.name ?? null,
    nextStopId: nextStopRow?.stop_id ?? null,
    inFlight: actionInFlight,
  });
  const pressStep = (key) => {
    if (key === 'accept') setActiveTab('schedule');
    else if (key === 'pair') setPairingOpen(true);
    else if (key === 'startShift') void handleStartShift();
    else if (key === 'endShift') void handleEndShift();
    else if (key === 'boarding') void handleTripAction('boarding');
    else if (key === 'depart') void handleTripAction('depart');
    else if (key === 'arrive' && nextStopRow?.stop_id) void handleAcknowledgeStop(nextStopRow.stop_id);
    else if (key === 'endTrip') void handleTripAction('complete');
  };

  const tripActionReason = driverTripActionReason({
    isPaired,
    hasOpenShift,
    status: trip?.status,
    boardingLabel: boardingGate.label,
    departLabel: departGate.label,
    finalStopDone,
  });

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
      bottomNav
      mobileAction={<TextSizeControl compact size={textSize.size} sizes={textSize.sizes} onChange={textSize.setSize} />}
    >
        <FirstPasswordPrompt profile={profile} />
        <header className="crew-header mb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
            <p className="text-xs text-slate-500">
              {getBusinessTodayLabel()}{currentRoute?.origin && currentRoute?.destination ? ` — ${currentRoute.origin} → ${currentRoute.destination}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <span className={`crew-chip ${headerBadge.tone}`}>
              {headerBadge.label}
            </span>
            <button
              className="crew-chip-button"
              onClick={loadData}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <NotificationBellButton service={DriverService} role="driver" onOpenNotification={openTripFromNotification} />
          </div>
          </div>
        </header>

        {loading && <SkeletonPage variant="crew" label="Loading driver workspace..." />}
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

        {showNoCurrentTripState && activeTab === 'activeTrip' && (
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
        {/* Batch 45 Feature B: the "Pair with crew" card opens the pairing and Daily PIN pop-up. */}
        {/* Batch 61 (advisor, 2026-11-13): Home is the next step, the alert button and today's trip, in large text.
            Traffic, the map and the stops are on Trip; assignments and the calendar are on Schedule. */}
        {!loading && activeTab === 'dashboard' && (
          <NextStepCard step={step} onPress={pressStep}>
            {step.key === 'none' && upcomingTrip && (
              <p className="mt-2 text-base text-slate-700">
                Next trip: {upcomingTrip?.fleet_route?.route?.origin || 'Not provided'} to {upcomingTrip?.fleet_route?.route?.destination || 'Not provided'} on {formatTripSchedule(upcomingTrip)}.
              </p>
            )}
            {step.key === 'pair' && pairingReason && <p className="mt-2 text-base text-slate-700">{pairingReason}</p>}
          </NextStepCard>
        )}

        {/* Batch 58: "Alert operator" while the trip is boarding, delayed or on the road. */}
        {!loading && activeTab === 'dashboard' && <CrewAlertCard service={DriverService} trip={trip} />}

        {!loading && activeTab === 'dashboard' && !showNoCurrentTripState && (hasActiveTrip || hasTodayAssignedTrip) && (
          <CrewTodayCard
            route={currentRoute?.route_name}
            fromTo={currentRoute?.origin && currentRoute?.destination ? `${currentRoute.origin} → ${currentRoute.destination}` : null}
            rows={[
              ['Bus', currentFleet?.plate_number],
              ['Leaves', formatTripSchedule(trip || todayAssignedTrip) === '-' ? null : formatTripSchedule(trip || todayAssignedTrip)],
              ['Status', derivedTripStatus.key === 'unknown' ? null : derivedTripStatus.label],
              ['Next stop', nextStop ? placeInMinutes(nextStop?.stop_name ?? nextStop?.name, driverEtaMinutes(trafficStatus, nextStop)) : null],
            ]}
            progress={tripIsLive ? tripProgress : null}
            onOpen={() => setActiveTab('activeTrip')}
          />
        )}

        {/* Batch 19 Part A: folded into Dashboard (was the standalone
            "Assigned Routes" nav item). Accept/decline never depended on
            pairing, so no gating needed here. */}
        {!loading && activeTab === 'schedule' && (
          <section className="staff-card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-lg font-bold text-slate-900">My trips</h4>
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
            <AssignmentSection
              role="driver"
              assignments={assignments}
              assignedTrips={assignedTrips}
              filter={assignedTripFilter}
              focusTripId={focusTripId}
              focusBlockId={focusBlockId}
              onDismissFocus={dismissTripFocus}
            />
          </section>
        )}

        {/* C-2: the dashboard widget opens a day in a modal; the Schedule page is the full calendar. Both read the
            server's calendar endpoints, scoped to the signed-in Driver. */}
        {!loading && activeTab === 'schedule' && <CalendarSummaryStrip service={DriverService} className="mb-4" />}
        {!loading && activeTab === 'schedule' && (
          <StaffCalendar key={calendarFocus || 'today'} service={DriverService} initialDate={calendarFocus} />
        )}


        {/* Batch 18: Shift Block Hand-off System. Independent of pairing —
            a scheduled block's takeover confirmation happens before any
            per-leg pairing is relevant. Batch 19 Part A: grouped under
            "Active Trip" (live operational state), not Schedule. */}
        {!loading && activeTab === 'schedule' && (
          <section className="staff-card">
            <h3 className="mb-4 text-lg font-bold text-slate-900">My shifts</h3>
            {/* 2026-10-27: no Confirm Takeover. A shift starts with its first trip and finishes with its last. */}
            <MyScheduleList blocks={shiftBlocks} />
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
                  className="min-h-12 rounded-xl bg-red-600 px-4 text-base font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                  onClick={() => handleTripAction('complete')}
                  disabled={actionInFlight || !isPaired || !finalStopDone || !['departed', 'in-progress'].includes(trip?.status)}
                >
                  End Trip
                </button>
              </div>
              {tripActionReason && <p data-testid="trip-action-reason" className="-mt-2 mb-3 text-xs text-amber-700">{tripActionReason}</p>}
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
          <ActiveTripTrafficCard trafficStatus={trafficStatus} nextStop={nextStop} />
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
                            className="ml-auto min-h-12 rounded-xl bg-sky-600 px-4 text-base font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
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

        {/* Batch 20 Item 3: pairing action moved to the Daily PIN page
            (pairing is driven by PIN/QR generation, so that's its
            semantically correct home) — Active Trip only shows a
            reminder banner + keeps its data/actions individually gated,
            no longer embeds the full PairingScreen widget here. */}
        {!loading && activeTab === 'activeTrip' && !isPaired && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">Not paired with your chauffeur yet</p>
            <p className="mt-1 text-sm text-amber-700">Live actions (start boarding, depart, end trip, acknowledge stops) stay off until you are paired with your chauffeur. Trip data below stays visible.</p>
            <button
              type="button"
              onClick={() => setPairingOpen(true)}
              className="mt-3 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-200"
            >
              Pair with crew
            </button>
          </section>
        )}

        {/* Batch 45 Feature B: the former Daily PIN tab, unchanged inside the "Pair with crew" pop-up (opened from the
            Dashboard card, the Active Trip reminder, or an old ?tab=pin link). */}
        <Modal open={!loading && pairingOpen} onClose={() => setPairingOpen(false)} title="Pair with crew" fullScreenOnMobile>
          <section className="space-y-4" data-testid="pair-with-crew-modal">
            {/* Batch 20 Item 3: pairing lives here now, not on Active Trip. */}
            {!isPaired && (
              <PairingScreen
                role="driver"
                paired={isPaired}
                pairingReason={pairingReason}
                pairingOpensAt={pairing?.opensAt}
                onPaired={() => void refreshPairingStatus()}
              />
            )}
            {/* Batch 53 item 9 (user): the Daily PIN check is gone from the Driver; pairing (QR or pairing ID) is enough. */}
            {isPaired && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">You are paired with your Chauffeur for this trip.</p>
            )}
          </section>
        </Modal>

        {activeTab === 'account' && (
          <section className="staff-card" aria-label="Text size setting">
            <h3 className="text-lg font-bold text-slate-900">Text size</h3>
            <p className="mb-3 mt-1 text-base text-slate-600">Make the words and buttons bigger or smaller on this phone.</p>
            <TextSizeControl size={textSize.size} sizes={textSize.sizes} onChange={textSize.setSize} />
          </section>
        )}
        {activeTab === 'account' && (
          <ProfilePage
            role="driver"
            profile={profile}
            loading={loading}
            twoFactor={{ enabled: twoFactorEnabled, saving: saving2fa, message: msg2fa, onChange: handleToggleTwoFactor }}
            availability={{ value: isAvailable, saving: availabilitySaving, onChange: handleToggleAvailability }}
            assignment={{ route: currentRoute?.route_name ?? null, fleet: currentFleet?.plate_number ?? null }}
            onSignOut={handleLogout}
          />
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
                  ['Seats left', placesLeft(fleet, td, 'seated')],
                  ['Standing places left', placesLeft(fleet, td, 'standing')],
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
