import { useState } from 'react';
import {
  AlertCircle,
  Bus,
  Camera,
  CalendarDays,
  CheckCircle2,
  Download,
  Gauge,
  KeyRound,
  Play,
  QrCode,
  RefreshCw,
  Ticket,
  UserCheck,
  Users,
} from 'lucide-react';
import PairingScreen from './PairingScreen';
import StaffPortalLayout from './StaffPortalLayout';
import DeclineTripModal from './DeclineTripModal';
import CalendarSummaryStrip from './CalendarSummaryStrip';
import DashboardCalendar from './DashboardCalendar';
import { ModalShell } from '../ui/Modal';
import StaffCalendar from './StaffCalendar';
import NotificationBellButton from './NotificationBellButton';
import { useConductorPairing, useConductorDashboardData } from '../../api/hooks/Staff/useConductorDashboard';
import { getBusinessTodayLabel } from '../../utils/dates';
import { deriveTripStatus } from '../../utils/tripStatus';
import { FOR_APPROVAL_LABEL, canRespondToAssignment, getAssignmentRequestStatus, isForApproval } from '../../utils/assignmentRequest';
import ConductorService from '../../api/StaffService/ConductorService';

// Batch 19 Part A: consolidated sidebar. Ticketing & Fares is the
// confirmed default landing screen (adviser requirement, Batch 15).
// "Assigned Routes" folds into Dashboard; Live Passengers, Shift Blocks,
// and Shift Summary merge into Active Shift (live operational state, not
// planning — so it groups here, not with Schedule); Calendar becomes
// Schedule. Start/End Shift move to the persistent header, matching the
// Driver portal's existing pattern (see header buttons below).
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: Gauge },
  { key: 'occupancy', label: 'Ticketing & Fares', icon: Ticket },
  { key: 'activeShift', label: 'Active Shift', icon: Bus },
  { key: 'schedule', label: 'Schedule', icon: CalendarDays },
  { key: 'pin', label: 'Daily PIN', icon: KeyRound },
  { key: 'account', label: 'Account', icon: UserCheck },
];

const formatDateTime = (value) => {
  if (!value) return '-';
  const str = String(value);
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

const STATUS_COLOR = {
  scheduled: '#153a6b',
  delayed: '#e11d48',
  boarding: '#3b82f6',
  departed: '#f59e0b',
  'in-progress': '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
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

const resolveConductorHeaderBadge = ({
  pairingLoading,
  isPaired,
  hasTodayAssignedTrip,
  forApproval,
  hasOpenShift,
  isAvailable,
  hasActiveTrip,
  tripStatus,
}) => {
  if (pairingLoading) return { label: 'Checking pairing', tone: 'border-slate-200 bg-slate-50 text-slate-600' };
  if (!isPaired) return { label: 'Pairing required', tone: 'border-amber-200 bg-amber-50 text-amber-700' };
  if (!hasTodayAssignedTrip) return { label: 'No assigned trip', tone: 'border-slate-200 bg-slate-50 text-slate-600' };
  // C6: assignment-level status, shown through this single badge (D6).
  if (forApproval) return { label: FOR_APPROVAL_LABEL, tone: 'border-amber-200 bg-amber-50 text-amber-700' };
  if (!hasOpenShift) return { label: 'Shift not started', tone: 'border-sky-200 bg-sky-50 text-sky-700' };
  if (!isAvailable) return { label: 'Marked unavailable', tone: 'border-slate-200 bg-slate-50 text-slate-600' };
  // A1: once the trip is live the badge is the trip's own derived status.
  if (hasActiveTrip && tripStatus) return { label: tripStatus.label, tone: tripStatus.tone };
  return { label: 'Ready', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
};

export default function ConductorDashboard() {
  const { pairing, refreshPairingStatus, handleLogout } = useConductorPairing();

  return (
    <ConductorDashboardInner
      onLogout={handleLogout}
      pairing={pairing}
      refreshPairingStatus={refreshPairingStatus}
    />
  );
}

function TripCardGroup({ title, trips, onDeclineTrip, onAcceptTrip, emptyMessage = 'No trips in this section.' }) {
  return (
    <div className="md:col-span-2 staff-card">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {trips.length === 0 ? (
        <article className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6">
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        </article>
      ) : (
        <div className="staff-grid md:grid-cols-2">
          {trips.map((item) => {
            // Batch 14: decline must be reachable from this list — today OR
            // upcoming — regardless of pairing status.
            const canDecline = ['scheduled', 'delayed', 'boarding'].includes(String(item?.status || '').toLowerCase());
            return (
              <article key={item.trip_id} className="staff-card">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Trip #{item.trip_id}</h3>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700">{item.status}</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-slate-500">Schedule</span><strong className="font-data text-slate-900">{formatTripSchedule(item)}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Fleet</span><strong className="text-slate-900">{item.fleet_route?.fleet?.plate_number || `Fleet ${item.fleet_route?.fleet_id || '-'}`}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Route</span><strong className="text-slate-900">{item.fleet_route?.route?.route_name || `Route ${item.fleet_route?.route_id || '-'}`}</strong></div>
                </div>
                {canDecline && (
                  <div className="mt-4 flex gap-2">
                    {canRespondToAssignment(item, 'conductor') && (
                      <button
                        type="button"
                        className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        onClick={() => onAcceptTrip?.(item)}
                      >
                        Accept
                      </button>
                    )}
                    {canRespondToAssignment(item, 'conductor') && (
                      <button
                        type="button"
                        className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        onClick={() => onDeclineTrip?.(item)}
                      >
                        Decline
                      </button>
                    )}
                    {getAssignmentRequestStatus(item, 'conductor') === 'for_approval' && (
                      <span className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-700">{FOR_APPROVAL_LABEL}</span>
                    )}
                    {getAssignmentRequestStatus(item, 'conductor') === 'rejected' && (
                      <span className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-600">Request rejected: please proceed</span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ConductorDashboardInner({ onLogout, pairing, refreshPairingStatus }) {
  const [confirmStart, setConfirmStart] = useState(false);
  // The day the full calendar opens on when reached from the dashboard widget (null = today).
  const [calendarFocus, setCalendarFocus] = useState(null);
  const {
    activeTab, setActiveTab,
    assignedTripFilter,
    profile,
    trip,
    occupancy,
    passengers,
    earnings,
    pinInput, setPinInput,
    pinStatus, setPinStatus,
    scanUuid, setScanUuid,
    scanResult, setScanResult,
    groupScanResult, setGroupScanResult,
    scannerRunning,
    scannerBusy,
    scannerError,
    scannerStatus,
    scannerPhase,
    showScannerModal, setShowScannerModal,
    onsiteReceipt,
    onsiteForm, setOnsiteForm,
    loading,
    error,
    actionMsg, setActionMsg,
    twoFactorEnabled,
    saving2fa,
    checkoutInFlight,
    confirmCheckout, setConfirmCheckout,
    confirmDecline, setConfirmDecline,
    declineErrors, setDeclineErrors,
    declineSubmitting,
    actionInFlight,
    isAvailable,
    shiftState,
    videoRef,
    isPaired,
    pairingReason,
    hasActiveTrip,
    hasTodayAssignedTrip,
    todayAssignedTrip,
    hasOpenShift,
    upcomingTrip,
    showNoCurrentTripState,
    routeStops,
    groupedPassengers,
    filteredAssignedTrips,
    todayAssignedTrips,
    upcomingAssignedTrips,
    tripDetailsModal, setTripDetailsModal,
    shiftBlocks,
    shiftBlockEligibility,
    shiftBlockActionInFlight,
    printOnsiteReceipt,
    occSeated,
    occStanding,
    occSeatedCap,
    occStandingCap,
    occTotalCap,
    occupiedTotal,
    standingCapacity,
    seatedRows,
    buildRowSeats,
    pageTitle,
    handleAssignedTripFilterChange,
    handleTwoFactorToggle,
    stopScanner,
    loadData,
    loadOccupancy,
    loadEarnings,
    handleStartShift,
    handleConfirmedDecline,
    handleAcceptTrip,
    handleEndShift,
    checkShiftBlockEligibility,
    handleInitiateShiftBlockHandoff,
    handleScan,
    startScanner,
    handleAlight,
    handleVerifyPin,
    handleOnsiteCheckout,
    handleConfirmedOnsiteCheckout,
    handleLogout,
  } = useConductorDashboardData({ onLogout, pairing });
  const openFullCalendar = (date) => {
    setCalendarFocus(date);
    setActiveTab('schedule');
  };

  const headerBadge = resolveConductorHeaderBadge({
    pairingLoading: pairing.loading,
    isPaired,
    hasTodayAssignedTrip,
    forApproval: isForApproval(todayAssignedTrip, 'conductor'),
    hasOpenShift,
    isAvailable,
    hasActiveTrip,
    tripStatus: deriveTripStatus(trip || todayAssignedTrip),
  });

  const busRouteLabel = `${todayAssignedTrip?.fleet_route?.fleet?.plate_number || 'Fleet pending'} · ${todayAssignedTrip?.fleet_route?.route?.route_name || 'Route pending'}`;

  const shiftAction = hasOpenShift
    ? {
      label: 'End Shift',
      onClick: handleEndShift,
      disabled: actionInFlight || !hasOpenShift || Boolean(shiftState?.endBlockedReason),
      title: shiftState?.endBlockedReason || undefined,
      className: 'inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60',
    }
    : {
      label: 'Start Shift',
      onClick: () => setConfirmStart(true),
      disabled: actionInFlight || !isPaired || !(hasActiveTrip || hasTodayAssignedTrip),
      title: !isPaired ? 'Pairing is required before starting shift.' : undefined,
      className: 'inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 disabled:opacity-60',
    };

  return (
    <>
    <StaffPortalLayout
      brandLabel="Chauffeur Portal"
      brandIcon={Bus}
      navItems={NAV_ITEMS}
      activeTab={activeTab}
      onTabChange={(key) => { setActiveTab(key); setActionMsg(''); setScanResult(null); }}
      profile={profile}
      profileRoleLabel="Chauffeur"
      profileInitialFallback="C"
      onLogout={handleLogout}
    >
        <header className="crew-header mb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
            <p className="text-xs text-slate-500">
              {getBusinessTodayLabel()}
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
              title={shiftAction.title}
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
            <NotificationBellButton service={ConductorService} role="conductor" />
            {actionMsg && <span className="basis-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{actionMsg}</span>}
          </div>
          </div>
        </header>
        {loading && <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Loading dashboard data...</div>}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {showNoCurrentTripState && (
          <section className="staff-card staff-card-roomy">
            <h3 className="text-lg font-bold text-slate-900">No Current Trip Available</h3>
            <p className="mt-2 text-sm text-slate-500">
              You currently do not have an active or same-day trip assignment.
            </p>
            {upcomingTrip ? (
              <p className="mt-3 text-sm text-teal-600">
                Upcoming trip: {upcomingTrip?.fleet_route?.route?.origin || '-'} to {upcomingTrip?.fleet_route?.route?.destination || '-'} on {formatTripSchedule(upcomingTrip)}.
              </p>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                No upcoming trip is assigned yet. Please check again later.
              </p>
            )}
            <button
              className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => setActiveTab('occupancy')}
            >
              Go to Ticketing
            </button>
          </section>
        )}

        {/* Batch 19 Part B: dashboard/ticketing data (assigned route,
            schedule, vehicle) always displays — pairing only disables
            the specific live actions below (each individually gated with
            a tooltip), not the whole tab. */}
        {!loading && ['dashboard', 'occupancy'].includes(activeTab) && !isPaired && (
          <section className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">Pairing required for live shift actions</p>
            <p className="mt-1 text-xs text-amber-700">{pairingReason} Your assignment info below stays visible — only shift/ticketing actions are disabled until paired.</p>
          </section>
        )}

        {/* Batch 20 Item 2: this "pre-shift review" hero belongs to
            Dashboard ONLY — it was previously also rendered on Ticketing &
            Fares (activeTab === 'occupancy' && !hasActiveTrip), duplicating
            Dashboard's content instead of showing Ticketing's own interface. */}
        {!loading && activeTab === 'dashboard' && !showNoCurrentTripState && (
          <section className="mx-auto max-w-2xl">
            {/* Welcome heading */}
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
                <CheckCircle2 className="h-6 w-6 text-teal-500" />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Welcome back, Chauffeur {profile?.name?.split(' ')[0] ?? 'John'}!
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Please review your fleet assignment and partner details before starting your shift today.
              </p>
            </div>

            {/* Assignment cards */}
            <div className="staff-grid sm:grid-cols-2">
              {/* Fleet card */}
              <div className="staff-card">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Assigned Vehicle / Fleet Number</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                    <Bus className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{todayAssignedTrip?.fleet_route?.fleet?.plate_number ?? 'Bus #1'}</p>
                    <p className="text-xs text-slate-500">{todayAssignedTrip?.fleet_route?.fleet?.make ?? 'Assigned Fleet'}</p>
                  </div>
                </div>
              </div>

              {/* Trip info card */}
              <div className="staff-card">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Current Trip Info</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Route</span>
                    <span className="font-semibold text-slate-900">{todayAssignedTrip?.fleet_route?.route?.route_name ?? '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status</span>
                    <span className="font-semibold capitalize text-teal-600">{todayAssignedTrip?.status ?? '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Schedule</span>
                    <span className="font-data text-slate-700">{formatTripSchedule(todayAssignedTrip)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Start Shift lives only in the header toggle (single entry point);
                it opens a confirm dialog after the assignment review above.
                Accept/Decline belong to the assigned-trip items only. */}
          </section>
        )}

        {/* Batch 20 Item 2: Ticketing & Fares' own "not started yet" state
            — distinct from Dashboard's hero, no duplicated Welcome/Confirm
            & Start Shift block. Points the conductor back to Dashboard to
            review/start their shift instead of repeating it here. */}
        {!loading && activeTab === 'occupancy' && !hasActiveTrip && !showNoCurrentTripState && (
          <section className="mx-auto max-w-md rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <Ticket className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <h3 className="text-base font-bold text-slate-900">Ticketing isn't active yet</h3>
            <p className="mt-2 text-sm text-slate-500">
              Start your shift from the Dashboard to unlock the ticket scanner and fare handling for today's trip.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="mt-4 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-600"
            >
              Go to Dashboard
            </button>
          </section>
        )}

        {/* Batch 19 Part A: folded into Dashboard (was the standalone
            "Assigned Routes" nav item). Accept/decline never depended on
            pairing, so no gating needed here. */}
        {!loading && activeTab === 'dashboard' && (
          <section className="mt-4 staff-grid md:grid-cols-2">
            <div className="md:col-span-2 flex items-center justify-end gap-2">
              <label htmlFor="conductor-assigned-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter</label>
              <select
                id="conductor-assigned-filter"
                value={assignedTripFilter}
                onChange={(event) => { void handleAssignedTripFilterChange(event.target.value); }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
              >
                <option value="all">All</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            {filteredAssignedTrips.length === 0 ? (
              <article className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-semibold text-slate-900">No Assigned Trips</h3>
                <p className="mt-2 text-sm text-slate-500">No trips match this filter.</p>
              </article>
            ) : (
              <>
                <TripCardGroup title="Today's Assigned Trip" trips={todayAssignedTrips} onDeclineTrip={setConfirmDecline} onAcceptTrip={handleAcceptTrip} />
                <TripCardGroup title="Upcoming Trips" trips={upcomingAssignedTrips} onDeclineTrip={setConfirmDecline} onAcceptTrip={handleAcceptTrip} emptyMessage="No upcoming trips match this filter." />
              </>
            )}
          </section>
        )}

        {/* C-2: the dashboard widget opens a day in a modal; the Schedule page is the full calendar. Both read the
            server's calendar endpoints, scoped to the signed-in Chauffeur. */}
        {!loading && activeTab === 'schedule' && <CalendarSummaryStrip service={ConductorService} className="mb-4" />}
        {!loading && activeTab === 'schedule' && (
          <StaffCalendar key={calendarFocus || 'today'} service={ConductorService} initialDate={calendarFocus} />
        )}

        {!loading && activeTab === 'dashboard' && (
          <div className="mt-4 space-y-4">
            <CalendarSummaryStrip service={ConductorService} />
            <DashboardCalendar service={ConductorService} onOpenFull={openFullCalendar} />
          </div>
        )}

        {/* Batch 19 Part A: Shift Blocks folds into Active Shift (live
            operational state, not a planning view). Independent of
            pairing — eligibility/hand-off is checked per-block against the
            block's own final-leg + GPS state. */}
        {!loading && activeTab === 'activeShift' && (
          <section className="staff-card">
            <h3 className="mb-4 text-base font-bold text-slate-900">My Shift Blocks</h3>
            {shiftBlocks.length === 0 ? (
              <p className="text-sm text-slate-500">No shift blocks assigned.</p>
            ) : (
              <div className="space-y-3">
                {shiftBlocks.map((block) => {
                  const eligibility = shiftBlockEligibility[block.shift_block_id];
                  return (
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
                          {block.status === 'in_progress' && (
                            <button
                              type="button"
                              onClick={() => void checkShiftBlockEligibility(block.shift_block_id)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Check Eligibility
                            </button>
                          )}
                          {block.status === 'in_progress' && (
                            <button
                              type="button"
                              onClick={() => handleInitiateShiftBlockHandoff(block.shift_block_id)}
                              disabled={shiftBlockActionInFlight || !eligibility?.eligible}
                              title={!eligibility?.eligible ? (eligibility?.reason || 'Check eligibility first — hand-off unlocks once the final leg arrives at the home terminal.') : undefined}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              End Shift / Initiate Hand-off
                            </button>
                          )}
                        </div>
                      </div>
                      {eligibility && !eligibility.eligible && (
                        <p className="mt-2 text-xs text-amber-600">{eligibility.reason}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Batch 20 Item 2: quick-tiles + seat layout only make sense once a
            trip is actually active (earnings/passenger counts would
            otherwise show stale/zero data before any shift has started) —
            the !hasActiveTrip case is covered by the placeholder above. */}
        {!loading && activeTab === 'occupancy' && hasActiveTrip && !showNoCurrentTripState && (
          <section className="max-w-5xl">
            {/* Bus + Passenger Load Header */}
            {occupancy && (
              <div className="crew-load-strip mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900 sm:text-2xl">
                    {trip?.fleet_route?.fleet?.plate_number ?? 'Bus 001'} - {trip?.fleet_route?.route?.route_name || `${trip?.fleet_route?.route?.origin || 'Route'} - ${trip?.fleet_route?.route?.destination || 'Pending'}`}
                  </p>
                </div>
                <div className="flex flex-1 items-center gap-3">
                  <span className="shrink-0 text-xs text-slate-500">Passenger Load</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-slate-100 h-2.5">
                    <div
                      className="h-full rounded-full bg-slate-500 transition-all"
                      style={{ width: `${occTotalCap > 0 ? Math.round((occupiedTotal / occTotalCap) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="shrink-0 font-data text-xs font-semibold text-slate-700">{occupiedTotal} / {occTotalCap} seats</span>
                </div>
              </div>
            )}

            {/* Batch 15, Item 8: consolidated "at a glance" strip — earnings
                and passenger count are visible here directly, without
                navigating to the separate Earnings/Passengers tabs. Those
                tabs still exist for full detail (breakdown table, per-
                passenger list). */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <button type="button" onClick={() => setActiveTab('activeShift')} className="staff-card staff-card-compact text-left transition hover:bg-slate-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Earnings So Far</p>
                <p className="font-data mt-1 text-lg font-bold text-slate-900">₱{earnings ? Number(earnings.total_fare).toFixed(2) : '0.00'}</p>
              </button>
              <button type="button" onClick={() => setActiveTab('activeShift')} className="staff-card staff-card-compact text-left transition hover:bg-slate-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Passengers Onboard</p>
                <p className="font-data mt-1 text-lg font-bold text-slate-900">{passengers?.length ?? earnings?.passenger_count ?? 0}</p>
              </button>
              <button type="button" onClick={() => setActiveTab('pin')} className="staff-card staff-card-compact text-left transition hover:bg-slate-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Daily PIN</p>
                <p className="mt-1 text-sm font-semibold text-teal-600">View / Verify →</p>
              </button>
            </div>
            {!occupancy ? (
              <article className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-bold text-slate-900">No Occupancy Data</h3>
              </article>
            ) : (
              <div className="staff-grid lg:grid-cols-[1.1fr_1fr]">
                <article className="staff-card">
                  <h3 className="mb-3 text-2xl font-bold text-slate-900">SEAT LAYOUT</h3>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white">
                      <Users className="h-3.5 w-3.5" /> Driver
                    </div>
                    <div className="max-h-115 overflow-y-auto pr-1">
                      <div className="space-y-2">
                        {Array.from({ length: seatedRows }).map((_, rowIndex) => (
                          <div key={`row-${rowIndex}`} className="grid grid-cols-5 gap-2">
                            {buildRowSeats(rowIndex).map((seatCell, cellIndex) => {
                              if (seatCell === 'aisle') {
                                return <div key={`aisle-${rowIndex}-${cellIndex}`} className="h-10 border-b border-dashed border-slate-300" />;
                              }

                              if (!seatCell) {
                                return <div key={`empty-${rowIndex}-${cellIndex}`} className="h-10" />;
                              }

                              return (
                                <div
                                  key={seatCell.id}
                                  className={`flex h-10 items-center justify-center rounded-lg text-xs font-semibold ${seatCell.occupied ? 'bg-slate-300 text-slate-700' : 'bg-emerald-500 text-white'}`}
                                >
                                  <Users className="h-3.5 w-3.5" />
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>

                      <div className="staff-card staff-card-compact mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Standing Capacity</p>
                        <div className="mt-2 grid grid-cols-8 gap-1.5">
                          {Array.from({ length: Math.min(standingCapacity, 24) }).map((_, index) => {
                            const standingOccupied = index < Math.min(occStanding, standingCapacity);
                            return (
                              <div
                                key={`standing-${index}`}
                                className={`h-4 rounded-full ${standingOccupied ? 'bg-slate-400' : 'bg-emerald-400'}`}
                                title={standingOccupied ? 'Standing occupied' : 'Standing available'}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-400" />Occupied</span>
                      <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500" />Available</span>
                    </div>
                  </div>
                </article>

                <article className="staff-card">
                  <h3 className="mb-4 text-2xl font-bold text-slate-900">Manual Cash Ticket</h3>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Select Origin</label>
                      <select
                        value={onsiteForm.origin_stop_id}
                        onChange={(e) => setOnsiteForm((prev) => ({ ...prev, origin_stop_id: e.target.value }))}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-slate-800 px-3 text-sm text-white outline-none focus:border-teal-500"
                      >
                        <option value="">Select origin stop</option>
                        {routeStops.map((stop) => (
                          <option key={`onsite-origin-${stop.stop_id}`} value={stop.stop_id}>
                            {stop?.stop?.stop_name || stop?.stop_name || `Stop ${stop.stop_id}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Select Destination</label>
                      <select
                        value={onsiteForm.destination_stop_id}
                        onChange={(e) => setOnsiteForm((prev) => ({ ...prev, destination_stop_id: e.target.value }))}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-slate-800 px-3 text-sm text-white outline-none focus:border-teal-500"
                      >
                        <option value="">Select destination stop</option>
                        {routeStops.map((stop) => (
                          <option key={`onsite-destination-${stop.stop_id}`} value={stop.stop_id}>
                            {stop?.stop?.stop_name || stop?.stop_name || `Stop ${stop.stop_id}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Passenger Type</label>
                      <select
                        value={onsiteForm.seat_type}
                        onChange={(e) => setOnsiteForm((prev) => ({ ...prev, seat_type: e.target.value }))}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-slate-800 px-3 text-sm text-white outline-none focus:border-teal-500"
                      >
                        <option value="seated">Regular</option>
                        <option value="standing">Standing</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Fare Amount (PHP)</label>
                      <input
                        type="text"
                        readOnly
                        value={onsiteForm.origin_stop_id && onsiteForm.destination_stop_id ? 'Auto-computed on Generate Ticket' : 'Select origin and destination first'}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 text-sm text-slate-700 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleOnsiteCheckout}
                        disabled={checkoutInFlight || !hasActiveTrip || !isPaired || !hasOpenShift}
                      >
                        {checkoutInFlight ? 'Processing...' : 'Generate Ticket'}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => setShowScannerModal(true)}
                        disabled={!hasOpenShift}
                      >
                        Scan Ticket
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        onClick={loadOccupancy}
                      >
                        Refresh Load
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => {
                          const didPrint = printOnsiteReceipt({ receipt: onsiteReceipt, routeStops });
                          if (!didPrint) {
                            setActionMsg('No onsite checkout receipt available to print yet.');
                          }
                        }}
                        disabled={!onsiteReceipt || !onsiteReceipt?.tickets?.length}
                      >
                        Print Last Ticket
                      </button>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <p>Total capacity: {occTotalCap} seats</p>
                      <p>Seated: {occSeated} / {occSeatedCap}</p>
                      <p>Standing: {occStanding} / {occStandingCap}</p>
                      {onsiteReceipt?.payment?.transaction_reference && (
                        <p className="mt-1 text-slate-700">Last receipt: {onsiteReceipt.payment.transaction_reference}</p>
                      )}
                    </div>
                  </div>
                </article>
              </div>
            )}

            {showScannerModal && (
              <ModalShell label="Scan ticket" onClose={() => { stopScanner(); setShowScannerModal(false); }}>
                <div className="w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Scan Ticket</h3>
                      <p className="text-xs text-slate-500">Use camera scanner or paste the ticket UUID manually.</p>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      onClick={() => {
                        stopScanner();
                        setShowScannerModal(false);
                      }}
                    >
                      Close
                    </button>
                  </div>

                  <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {!scannerRunning ? (
                        <button
                          type="button"
                          className="flex items-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => void startScanner()}
                          disabled={!hasOpenShift || !isPaired}
                          title={!isPaired ? 'Pairing is required to scan tickets.' : undefined}
                        >
                          <Camera className="h-4 w-4" />
                          Start Camera Scanner
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                          onClick={stopScanner}
                        >
                          <Camera className="h-4 w-4" />
                          Stop Camera
                        </button>
                      )}

                      <span className="text-xs text-slate-500">
                        {scannerRunning ? 'Live scanner is active' : 'Scanner is idle'}
                      </span>
                    </div>

                    <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                      <video
                        ref={videoRef}
                        className="h-70 w-full bg-slate-950 object-cover sm:h-90 lg:h-110"
                        muted
                        playsInline
                        autoPlay
                      />
                      {scannerBusy && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 backdrop-blur-sm">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-sky-400" />
                          <p className="text-xs font-semibold text-sky-300">Validating...</p>
                        </div>
                      )}
                    </div>

                    {scannerStatus && <p className="mt-2 text-xs text-slate-500">{scannerStatus}</p>}
                    {scannerError && <p className="mt-2 text-xs text-red-600">{scannerError}</p>}
                    <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                      {scannerPhase === 'idle' && 'Scanner idle'}
                      {scannerPhase === 'captured' && 'QR captured'}
                      {scannerPhase === 'validating' && 'Validating'}
                      {scannerPhase === 'success' && 'Boarded'}
                      {scannerPhase === 'failed' && 'Validation failed'}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      placeholder="ticket-uuid-here"
                      value={scanUuid}
                      onChange={(e) => {
                        setScanUuid(e.target.value);
                        setScanResult(null);
                        setGroupScanResult(null);
                      }}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-500"
                    />
                    <button
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={handleScan}
                      disabled={scannerBusy || !hasOpenShift}
                    >
                      {scannerBusy
                        ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />Validating...</>
                        : <><QrCode className="h-4 w-4" />Scan</>}
                    </button>
                  </div>

                  {scanResult && (
                    <div
                      className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                        scanResult.success
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }`}
                    >
                      <p className="font-semibold">{scanResult.msg}</p>
                    </div>
                  )}

                  {groupScanResult && (
                    <div
                      className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                        groupScanResult.success && groupScanResult.info
                          ? 'border-sky-200 bg-sky-50 text-sky-700'
                          : groupScanResult.success
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }`}
                    >
                      <p className="font-semibold">{groupScanResult.msg || 'Group scan processed.'}</p>
                      {groupScanResult.success && (
                        <p className="mt-1 text-xs">
                          Boarded {groupScanResult?.data?.boarded_count ?? 0} of {groupScanResult?.data?.total_tickets ?? 0} ticket(s).
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </ModalShell>
            )}
          </section>
        )}

        {/* Batch 19 Part B: Live Passengers data always shows — only the
            Record Alight action is pairing-gated. */}
        {!loading && activeTab === 'activeShift' && !showNoCurrentTripState && (
          <section className="staff-card">
            {groupedPassengers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-semibold text-slate-900">No Passengers</h3>
                <p className="mt-2 text-sm text-slate-500">No passengers currently on this trip.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedPassengers.map((group) => (
                  <div key={`passenger-group-${group.key}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Trip #{group.tripId}
                      </h3>
                      <div className="text-xs text-slate-500">
                        {group.routeName ? `${group.routeName} • ` : ''}
                        {group.passengers.length} passenger(s)
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-180 text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.16em] text-slate-500">
                            <th className="py-3">#</th>
                            <th className="py-3">Name</th>
                            <th className="py-3">Seat Type</th>
                            <th className="py-3">Destination</th>
                            <th className="py-3">Status</th>
                            <th className="py-3">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.passengers.map((p, i) => {
                            const status = p.status ?? 'boarded';
                            return (
                              <tr key={p.ticket_id ?? `${group.key}-${i}`} className="border-b border-slate-100">
                                <td className="py-3 font-data text-slate-500">{p.row_number}</td>
                                <td className="py-3 text-slate-900">{p.passenger_name ?? p.passenger?.name ?? 'Guest'}</td>
                                <td className="py-3"><span className="rounded-full border border-slate-200 px-2 py-1 text-xs capitalize text-slate-600">{p.seat_type}</span></td>
                                <td className="py-3 text-slate-600">{p.destination_display}</td>
                                <td className="py-3"><span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs capitalize text-emerald-700">{status}</span></td>
                                <td className="py-3">
                                  {!p.alighted_at && (
                                    <button
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                      onClick={() => handleAlight(p.ticket_id)}
                                      disabled={!isPaired}
                                      title={!isPaired ? 'Pairing is required to record alighting.' : undefined}
                                    >
                                      <UserCheck className="h-3.5 w-3.5" />
                                      Record Alight
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}


        {!loading && activeTab === 'activeShift' && showNoCurrentTripState && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">No active trip. Shift summary is available during an active trip.</div>
        )}

        {/* Batch 19 Part A: Shift Summary folds into Active Shift. Part B:
            revenue/passenger data always shows — the End Shift action is
            individually disabled below (also available in the header). */}
        {!loading && activeTab === 'activeShift' && !showNoCurrentTripState && (
          <section>
            {/* Shift Summary Header */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-slate-900">Shift Summary</h2>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                  <Download className="h-3.5 w-3.5" />
                  Download Summary Report
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-teal-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleEndShift}
                  disabled={actionInFlight || !hasOpenShift}
                >
                  Verify &amp; End Shift
                </button>
              </div>
            </div>
            {actionMsg && <p className="mb-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-700">{actionMsg}</p>}

            {/* Stats row */}
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="staff-card">
                <p className="text-xs text-slate-400">Total Revenue</p>
                <p className="font-data mt-1 text-xl font-bold text-slate-900">₱{earnings ? Number(earnings.total_fare).toFixed(2) : '0.00'}</p>
              </div>
              <div className="staff-card">
                <p className="text-xs text-slate-400">Fare Collected</p>
                <p className="font-data mt-1 text-xl font-bold text-slate-900">₱{earnings ? Number(earnings.onsite_amount).toFixed(2) : '0.00'}</p>
              </div>
              <div className="staff-card">
                <p className="text-xs text-slate-400">Digital Payments</p>
                <p className="font-data mt-1 text-xl font-bold text-slate-900">₱{earnings ? Number(earnings.online_amount).toFixed(2) : '0.00'}</p>
              </div>
              <div className="staff-card">
                <p className="text-xs text-slate-400">Passengers</p>
                <p className="font-data mt-1 text-xl font-bold text-slate-900">{earnings?.passenger_count ?? 0}</p>
              </div>
            </div>

            {/* Trip breakdown */}
            <div className="staff-card staff-card-flush overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-bold text-slate-900">Trip Breakdown</p>
                <button className="text-xs text-teal-600 hover:text-teal-700" onClick={loadEarnings}>Refresh</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-96 text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-4 py-3">Trip No</th>
                      <th className="px-4 py-3">Route</th>
                      <th className="px-4 py-3">Entry Time</th>
                      <th className="px-4 py-3">Exit Time</th>
                      <th className="px-4 py-3">Fare Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {earnings?.trips && earnings.trips.length > 0 ? (
                      earnings.trips.map((t, i) => (
                        <tr key={t.trip_id ?? i}>
                          <td className="px-4 py-3 font-data text-slate-500">TRP-{String(t.trip_id ?? i + 1).padStart(3, '0')}</td>
                          <td className="px-4 py-3 text-slate-900">{t.origin ?? '-'} → {t.destination ?? '-'}</td>
                          <td className="px-4 py-3 font-data text-slate-600">{toCompactTime(t.entry_time) || '-'}</td>
                          <td className="px-4 py-3 font-data text-slate-600">{toCompactTime(t.exit_time) || '-'}</td>
                          <td className="px-4 py-3 font-data font-semibold text-teal-600">₱{Number(t.fare ?? 0).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-xs">No trip breakdown available yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {!loading && activeTab === 'pin' && (
          <section className="space-y-4">
            <PairingScreen
              role="conductor"
              paired={isPaired}
              pairingReason={pairingReason}
              onPaired={() => {
                void refreshPairingStatus();
                void loadData();
              }}
            />

            {isPaired && !showNoCurrentTripState && (
              <article className="max-w-xl staff-card staff-card-roomy">
                <h3 className="text-lg font-bold text-slate-900">Verify Daily PIN</h3>
                <p className="mt-1 text-xs text-slate-500">Manual PIN verification uses the same assignment checks and trip context.</p>
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      setPinStatus('');
                    }}
                    className="font-data h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400"
                  />
                  <button
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
                    onClick={handleVerifyPin}
                  >
                    Verify
                  </button>
                </div>
                {pinStatus && (
                  <p className={`mt-3 text-sm ${pinStatus === 'PIN verified successfully.' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {pinStatus}
                  </p>
                )}
              </article>
            )}
          </section>
        )}

        {!loading && activeTab === 'account' && (
          <section className="staff-grid lg:grid-cols-2">
            <article className="staff-card">
              <h4 className="mb-3 text-base font-semibold text-slate-900">Profile Information</h4>
              <div className="mb-4 flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-emerald-600 to-teal-600 text-2xl font-bold text-white">
                  {(profile?.name || 'C')[0].toUpperCase()}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{profile?.name || 'Conductor'}</h3>
                <p className="text-xs text-slate-500">Verified Conductor</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-slate-500">Email</span><strong className="text-slate-900">{profile?.user?.email || profile?.email || '-'}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Conductor ID</span><strong className="font-data text-slate-900">{profile?.company_user_id || '-'}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Status</span><strong className="text-emerald-600">Active</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Shift Started</span><strong className="font-data text-slate-900">{formatDateTime(shiftState?.latestShift?.started_at)}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Shift Ended</span><strong className="font-data text-slate-900">{formatDateTime(shiftState?.latestShift?.ended_at)}</strong></div>
              </div>
            </article>

            <article className="staff-card">
              <h4 className="mb-3 text-base font-semibold text-slate-900">Security & 2FA</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Two-Factor Authentication</span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={twoFactorEnabled}
                      onChange={handleTwoFactorToggle}
                      disabled={saving2fa}
                    />
                    <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-emerald-500 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
                  </label>
                </div>
                {actionMsg && (
                  <p className={`text-xs ${actionMsg.includes('enabled') ? 'text-emerald-600' : 'text-sky-600'}`}>
                    {actionMsg}
                  </p>
                )}
              </div>
            </article>
          </section>
        )}
    </StaffPortalLayout>

      {/* Start Shift confirmation (header toggle is the only entry point) */}
      {confirmStart && (
        <ModalShell label="Start shift" onClose={() => setConfirmStart(false)} closeOnOverlay={false} overlayClassName="bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-bold text-slate-100">Start Shift?</h3>
            <p className="mb-4 text-sm text-slate-400">Confirm your assignment. You will be taken to the Ticketing screen.</p>
            <dl className="mb-4 space-y-2 rounded-lg bg-slate-800 p-3 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Fleet</dt><dd className="font-semibold text-slate-100">{todayAssignedTrip?.fleet_route?.fleet?.plate_number ?? '-'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Route</dt><dd className="font-semibold text-slate-100">{todayAssignedTrip?.fleet_route?.route?.route_name ?? '-'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Schedule</dt><dd className="font-data text-slate-100">{formatTripSchedule(todayAssignedTrip)}</dd></div>
            </dl>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmStart(false)} className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button type="button" onClick={() => { setConfirmStart(false); handleStartShift(); }} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">Start Shift <Play className="h-4 w-4" /></button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ── Onsite Checkout Confirmation Modal ─────────────────────── */}
      {confirmCheckout && (
        <ModalShell label="Record cash payment" onClose={() => setConfirmCheckout(false)} closeOnOverlay={false} overlayClassName="bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-bold text-slate-100">Record Cash Payment?</h3>
            <p className="mb-4 text-sm text-slate-400">This will create a payment record. <strong className="text-amber-300">This cannot be undone.</strong></p>
            <dl className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-800 p-3 text-sm">
              <div><dt className="text-xs text-slate-500">Seat Type</dt><dd className="font-semibold text-slate-100 capitalize">{onsiteForm.seat_type}</dd></div>
              <div><dt className="text-xs text-slate-500">Trip ID</dt><dd className="font-semibold text-slate-100">#{trip?.trip_id}</dd></div>
            </dl>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmCheckout(false)} className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button type="button" onClick={handleConfirmedOnsiteCheckout} className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Confirm Payment</button>
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

      {tripDetailsModal && (() => {
        const td = tripDetailsModal;
        const route = td.fleet_route?.route || {};
        const fleet = td.fleet_route?.fleet || {};
        return (
          <ModalShell label="Trip details" onClose={() => setTripDetailsModal(null)}>
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


