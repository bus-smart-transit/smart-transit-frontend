import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Bus,
  CalendarDays,
  Download,
  Gauge,
  Play,
  RefreshCw,
  Ticket,
  UserCheck,
} from 'lucide-react';
import DropOffGroups from './DropOffGroups';
import PairingScreen from './PairingScreen';
import StaffPortalLayout from './StaffPortalLayout';
import ProfilePage from '../Account/ProfilePage';
import FirstPasswordPrompt from '../Account/FirstPasswordPrompt';
import AssignmentSection from './AssignmentSection';
import MyScheduleList from './MyScheduleList';
import CalendarSummaryStrip from './CalendarSummaryStrip';
import Modal, { ModalShell } from '../ui/Modal';
import PairWithCrewCard from './PairWithCrewCard';
import CrewAlertCard from './CrewAlertCard';
import StaffCalendar from './StaffCalendar';
import NotificationBellButton from './NotificationBellButton';
import NextStepCard from './Crew/NextStepCard';
import CrewTodayCard from './Crew/CrewTodayCard';
import TextSizeControl from './Crew/TextSizeControl';
import useCrewTextSize from '../../api/hooks/Staff/useCrewTextSize';
import useTextMessages from '../../api/hooks/useTextMessages';
import { chauffeurNextStep } from '../../utils/crewNextStep';
import { useConductorPairing, useConductorDashboardData } from '../../api/hooks/Staff/useConductorDashboard';
import useOnsiteQuote from '../../api/hooks/Staff/useOnsiteQuote';
import { getBusinessToday, getBusinessTodayLabel } from '../../utils/dates';
import { downloadShiftSummary } from '../../utils/shiftSummaryReport';
import ChauffeurScannerCard from './ChauffeurScannerCard';
import { DEFAULT_FILE_TYPE } from '../../utils/tableExport';
import FileTypeSelect from '../ui/FileTypeSelect';
import { todaySummary } from '../../utils/assignmentCards';
import { ticketingReason } from '../../utils/actionReasons';
import { boardingStopsForLeg, checkInLabel, destinationsAhead, destinationsNotPassed, isOnsiteFormComplete, orderedStopsForLeg, placesLeft, stopLabel } from '../../utils/cashTicket';
import { isExpress } from '../../utils/serviceType';
import ServiceTypeChip from '../ui/ServiceTypeChip';
import { deriveTripStatus } from '../../utils/tripStatus';
import { FOR_APPROVAL_LABEL, isForApproval } from '../../utils/assignmentRequest';
import ConductorService from '../../api/StaffService/ConductorService';

import { SkeletonPage } from '../ui/Skeleton';
// Batch 19 Part A: consolidated sidebar. Ticketing & Fares is the
// confirmed default landing screen (adviser requirement, Batch 15).
// "Assigned Routes" folds into Dashboard; Live Passengers, Shift Blocks,
// and Shift Summary merge into Active Shift (live operational state, not
// planning — so it groups here, not with Schedule); Calendar becomes
// Schedule. Start/End Shift move to the persistent header, matching the
// Driver portal's existing pattern (see header buttons below).
const NAV_ITEMS = [
  // Batch 61 (advisor): short labels for the phone's bottom bar.
  { key: 'dashboard', label: 'Home', icon: Gauge },
  { key: 'occupancy', label: 'Tickets', icon: Ticket },
  { key: 'activeShift', label: 'Shift', icon: Bus },
  { key: 'schedule', label: 'Schedule', icon: CalendarDays },
  // Batch 45 Feature B: the Daily PIN tab is now the "Pair with crew" pop-up on the Dashboard.
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



function ConductorDashboardInner({ onLogout, pairing, refreshPairingStatus }) {
  const [onsiteDiscountTypes, setOnsiteDiscountTypes] = useState([]);
  const [onsiteDiscountError, setOnsiteDiscountError] = useState('');
  const [onsiteDiscountTypeKey, setOnsiteDiscountTypeKey] = useState('');
  const [onsiteDiscountIdChecked, setOnsiteDiscountIdChecked] = useState(false);
  const [confirmStart, setConfirmStart] = useState(false);
  // 2026-10-28 (§4.5): no opening cash at Start Shift. Chauffeurs are not given petty cash, so a shift starts at 0.
  // Batch 29: End Shift asks for the cash counted and handed over; the Operator confirms it on the web dashboard.
  const [confirmEnd, setConfirmEnd] = useState(false);
  // 2026-11-08 (advisor, user): the shift summary downloads as PDF or CSV.
  const [summaryFileType, setSummaryFileType] = useState(DEFAULT_FILE_TYPE);
  const [closingCash, setClosingCash] = useState('');
  const closingCashValue = Number(closingCash);
  const closingCashInvalid = closingCash === '' || !Number.isFinite(closingCashValue) || closingCashValue < 0;
  // The day the full calendar opens on when reached from the dashboard widget (null = today).
  const [calendarFocus] = useState(null); // Batch 61: the Home calendar widget is gone, so it stays today.
  const {
    activeTab, setActiveTab, pairingOpen, setPairingOpen,
    focusTripId, openTripFromNotification, dismissTripFocus,
    focusBlockId, assignments,
    assignedTrips,
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
    onsiteReceipt,
    onsiteForm, setOnsiteForm,
    cashForm,
    midTripAvailable,
    boardingPoint,
    boardingView,
    refreshBoardingPoint,
    checkIns,
    checkInBusy,
    handlePassengerIn,
    quoteNonce,
    loading,
    error,
    actionMsg, setActionMsg,
    twoFactorEnabled,
    saving2fa,
    checkoutInFlight,
    confirmCheckout, setConfirmCheckout,
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
    tripDetailsModal, setTripDetailsModal,
    shiftBlocks,
    printOnsiteReceipt,
    occSeated,
    occStanding,
    occSeatedCap,
    occStandingCap,
    occTotalCap,
    occupiedTotal,
    cashCapacity,
    pageTitle,
    handleAssignedTripFilterChange,
    handleTwoFactorToggle,
    availabilitySaving,
    handleToggleAvailability,
    stopScanner,
    loadData,
    loadOccupancy,
    loadEarnings,
    handleStartShift,
  refreshEndBlockedReason,
    handleEndShift,
    handleScan,
    startScanner,
    handleAlight,
    handleConfirmDropOff,
    dropOffGroups,
    handleVerifyPin,
    handleOnsiteCheckout,
    handleConfirmedOnsiteCheckout,
    handleLogout,
  } = useConductorDashboardData({ onLogout, pairing });
  useEffect(() => {
    let active = true;
    ConductorService.getOnsiteDiscountTypes()
      .then((response) => {
        if (active) setOnsiteDiscountTypes(Array.isArray(response?.data) ? response.data : []);
      })
      .catch((err) => {
        if (active) setOnsiteDiscountError(err?.message || 'Discount options could not be loaded.');
      });
    return () => { active = false; };
  }, []);

  const selectedOnsiteDiscount = onsiteDiscountTypes.find((type) => type.key === onsiteDiscountTypeKey) ?? null;
  const requestOnsiteCheckout = () => {
    if (onsiteDiscountTypeKey && !onsiteDiscountIdChecked) {
      setActionMsg('Check the passenger ID before applying this discount.');
      return;
    }
    handleOnsiteCheckout();
  };
  const confirmOnsiteCheckout = async () => {
    const completed = await handleConfirmedOnsiteCheckout({
      discount_type_key: onsiteDiscountTypeKey,
      discount_id_checked: onsiteDiscountIdChecked,
    }, onsiteQuote.status === 'ready' ? onsiteQuote.amount : null);
    if (completed) {
      setOnsiteDiscountTypeKey('');
      setOnsiteDiscountIdChecked(false);
    }
  };
  // Batch 27: the cash ticket offers real stopping stops in the order this leg travels
  // them, and only stops ahead of the boarding stop as destinations. The server
  // computes the fare either way.
  const legStops = orderedStopsForLeg(routeStops, trip?.leg_direction, trip?.service_type);
  // Batch 60 item 2: the leg's destination is never a boarding stop.
  const boardingStops = boardingStopsForLeg(legStops);
  const tripIsExpress = isExpress(trip?.service_type);
  // Task 6: by bus position the server names the stops ahead of the bus; by stop, the stops after the boarding stop.
  const byBusPosition = cashForm.boarding_mode === 'gps';
  // Passenger In (2026-10-26): a checked-in passenger's fare counts from the stop kept at check-in.
  const byCheckIn = cashForm.boarding_mode === 'checkin';
  const selectedCheckIn = byCheckIn ? checkIns.find((c) => String(c.id) === String(cashForm.pending_boarding_id)) ?? null : null;
  const destinationOptions = byBusPosition
    ? boardingView.destinations.map((d) => ({ stop_id: d.stop_id, stop_name: `${d.stop_name} (${d.distance_km} km)` }))
    : destinationsNotPassed(
      destinationsAhead(legStops, byCheckIn ? selectedCheckIn?.stop_id : onsiteForm.origin_stop_id),
      legStops,
      ['departed', 'in-progress'].includes(trip?.status) ? trip?.last_acknowledged_stop_id : null,
    );
  const boardingReady = byBusPosition ? boardingView.good : byCheckIn ? Boolean(selectedCheckIn) : Boolean(onsiteForm.origin_stop_id);
  const formReady = isOnsiteFormComplete(cashForm, boardingView);
  // The exact fare, asked of the server as soon as the boarding point and destination are chosen; by bus position it is
  // asked again whenever the position is refreshed.
  const onsiteQuote = useOnsiteQuote({
    tripId: trip?.trip_id,
    form: cashForm,
    ready: formReady,
    refreshKey: `${byBusPosition ? boardingView.distanceFromOriginKm : 0}-${quoteNonce}`,
    discount: { discount_type_key: onsiteDiscountTypeKey, discount_id_checked: onsiteDiscountIdChecked },
  });

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

  // Batch 29: the vehicle and trip tiles read the same card (and so the same fleet, route and status) as the Assigned
  // Routes list; the live trip fills in only what the card lacks. Nothing is invented: a missing value says so.
  const cardToday = todaySummary(assignments.cards, getBusinessToday());
  const todayInfo = {
    plate: cardToday?.plate ?? todayAssignedTrip?.fleet_route?.fleet?.plate_number ?? 'Unavailable',
    route: cardToday?.route ?? todayAssignedTrip?.fleet_route?.route?.route_name ?? 'Unavailable',
    status: cardToday?.status ?? todayAssignedTrip?.status ?? 'Unavailable',
    schedule: cardToday?.schedule ?? (todayAssignedTrip ? formatTripSchedule(todayAssignedTrip) : 'Unavailable'),
  };

  // Batch 29: the shift (and the pairing key) unlock only after the assignment is accepted.
  // The shift's cash comes with the shift status (it does not depend on an active trip: by End Shift every leg is finished).
  const endCash = shiftState?.cash ?? earnings?.shift ?? null;
  const needsAcceptance = Boolean(todayAssignedTrip) && !todayAssignedTrip.conductor_accepted_at;
  // Batch 61 (advisor, 2026-11-13): the Home shows one big button, the next step (it replaces the header's shift button).
  const textSize = useCrewTextSize();
  const textMessages = useTextMessages(ConductorService, profile); // Batch 67
  const step = chauffeurNextStep({
    hasWork: hasActiveTrip || hasTodayAssignedTrip,
    forApproval: isForApproval(todayAssignedTrip, 'conductor'),
    needsAcceptance,
    isPaired,
    hasOpenShift,
    hasActiveTrip,
    tripStatus: trip?.status,
    endBlockedReason: shiftState?.endBlockedReason || '',
    inFlight: actionInFlight,
  });
  const pressStep = (key) => {
    if (key === 'accept') setActiveTab('schedule');
    else if (key === 'pair') setPairingOpen(true);
    else if (key === 'startShift') setConfirmStart(true);
    else if (key === 'endShift') { void refreshEndBlockedReason(); setConfirmEnd(true); }
    else if (key === 'tickets') setActiveTab('occupancy');
  };
  const ticketingBlocked = ticketingReason({ isPaired, hasOpenShift, hasActiveTrip, isFull: cashCapacity.isFull });

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
      bottomNav
      mobileAction={<TextSizeControl compact size={textSize.size} sizes={textSize.sizes} onChange={textSize.setSize} />}
    >
        <FirstPasswordPrompt profile={profile} />
        <header className="crew-header mb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
            <p className="text-xs text-slate-500">
              {getBusinessTodayLabel()}
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
            <NotificationBellButton service={ConductorService} role="conductor" onOpenNotification={openTripFromNotification} />
            {actionMsg && <span className="basis-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{actionMsg}</span>}
          </div>
          </div>
        </header>
        {loading && <SkeletonPage variant="crew" label="Loading dashboard data..." />}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {showNoCurrentTripState && activeTab === 'occupancy' && (
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
        {/* Batch 45 Feature B: the "Pair with crew" card opens the pairing and Daily PIN pop-up. */}
        {!loading && activeTab === 'occupancy' && (
          <PairWithCrewCard paired={isPaired} reason={pairingReason} partner="Driver" onOpen={() => setPairingOpen(true)} />
        )}

        {/* Batch 61 (advisor, 2026-11-13): Home is the next step, the alert button and today's bus and trip, in large text.
            Assignments and the calendar are on Schedule. */}
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
        {!loading && activeTab === 'dashboard' && <CrewAlertCard service={ConductorService} trip={trip} />}

        {!loading && activeTab === 'dashboard' && !showNoCurrentTripState && (hasActiveTrip || hasTodayAssignedTrip) && (
          <CrewTodayCard
            route={todayInfo.route === 'Unavailable' ? null : todayInfo.route}
            rows={[
              ['Bus', todayInfo.plate === 'Unavailable' ? null : todayInfo.plate],
              ['Leaves', todayInfo.schedule === 'Unavailable' ? null : todayInfo.schedule],
              ['Status', todayInfo.status === 'Unavailable' ? null : String(todayInfo.status).replace('-', ' ')],
            ]}
          />
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
              Start your shift from Home to unlock the ticket scanner and fare handling for today's trip.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="mt-4 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-600"
            >
              Go to Home
            </button>
          </section>
        )}

        {/* Batch 19 Part A: folded into Dashboard (was the standalone
            "Assigned Routes" nav item). Accept/decline never depended on
            pairing, so no gating needed here. */}
        {!loading && activeTab === 'schedule' && (
          <section className="staff-grid md:grid-cols-2">
            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-lg font-bold text-slate-900">My trips</h4>
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
            <AssignmentSection
              role="conductor"
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
            server's calendar endpoints, scoped to the signed-in Chauffeur. */}
        {!loading && activeTab === 'schedule' && <CalendarSummaryStrip service={ConductorService} className="mb-4" />}
        {!loading && activeTab === 'schedule' && (
          <StaffCalendar key={calendarFocus || 'today'} service={ConductorService} initialDate={calendarFocus} />
        )}


        {/* Batch 19 Part A: Shift Blocks folds into Active Shift (live
            operational state, not a planning view). Independent of
            pairing — eligibility/hand-off is checked per-block against the
            block's own final-leg + GPS state. */}
        {!loading && activeTab === 'schedule' && (
          <section className="staff-card">
            <h3 className="mb-4 text-lg font-bold text-slate-900">My shifts</h3>
            {/* 2026-10-27: no hand-off button. A shift finishes with its last trip; End Shift hands over the cash. */}
            <MyScheduleList blocks={shiftBlocks} />
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
                    {trip?.fleet_route?.fleet?.plate_number ?? 'Bus unavailable'} - {trip?.fleet_route?.route?.route_name || `${trip?.fleet_route?.route?.origin || 'Route'} - ${trip?.fleet_route?.route?.destination || 'Pending'}`}
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
                <p className="font-data mt-1 text-lg font-bold text-slate-900">₱{earnings ? Number(earnings.net_total ?? earnings.total_fare).toFixed(2) : '0.00'}</p>
              </button>
              <button type="button" onClick={() => setActiveTab('activeShift')} className="staff-card staff-card-compact text-left transition hover:bg-slate-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Passengers Onboard</p>
                <p className="font-data mt-1 text-lg font-bold text-slate-900">{passengers?.length ?? earnings?.passenger_count ?? 0}</p>
              </button>
{/* Batch 53 item 9: hidden once paired. */}
              {!isPaired && (
              <button type="button" onClick={() => setPairingOpen(true)} className="staff-card staff-card-compact text-left transition hover:bg-slate-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Daily PIN</p>
                <p className="mt-1 text-sm font-semibold text-teal-600">Pair with crew →</p>
              </button>
              )}
            </div>
            {!occupancy ? (
              <article className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-bold text-slate-900">No Occupancy Data</h3>
              </article>
            ) : (
              <div className="staff-grid lg:grid-cols-[1.1fr_1fr]">
                {/* Batch 51 item 9 (user's design): the scanner card takes the capacity card's place; the capacity numbers and
                    the full-bus notice are in the cash ticket card. */}
                <ChauffeurScannerCard
                  videoRef={videoRef}
                  scannerRunning={scannerRunning}
                  scannerBusy={scannerBusy}
                  scannerPhase={scannerPhase}
                  scannerStatus={scannerStatus}
                  scannerError={scannerError}
                  canScan={hasOpenShift && isPaired}
                  blockedReason={!isPaired ? 'Pair with your Driver first to scan tickets.' : !hasOpenShift ? 'Start your shift to scan tickets.' : ''}
                  onStart={() => void startScanner()}
                  onStop={stopScanner}
                  ticketCode={scanUuid}
                  onTicketCodeChange={(value) => { setScanUuid(value); setScanResult(null); setGroupScanResult(null); }}
                  onBoardByCode={handleScan}
                  scanResult={scanResult}
                  groupScanResult={groupScanResult}
                />

                <article className="staff-card">
                  <h3 className="mb-4 flex items-center gap-2 text-2xl font-bold text-slate-900">Manual Cash Ticket <ServiceTypeChip serviceType={trip?.service_type} /></h3>
                  {tripIsExpress && (
                    <p role="status" data-testid="express-fare-note" className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Express trip: only the stops it serves are listed. A ticket is issued only where an express fare exists for this bus class; if not, the system says &quot;Fare unavailable&quot; and nothing is sold.
                    </p>
                  )}

                  <div className="space-y-3">
                    {midTripAvailable && (
                      <div className="rounded-lg border border-teal-200 bg-teal-50 p-3" data-testid="passenger-in">
                        <button
                          type="button"
                          onClick={handlePassengerIn}
                          disabled={checkInBusy || !isPaired || !hasOpenShift}
                          className="w-full rounded-lg bg-teal-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {checkInBusy ? 'Checking in...' : 'Passenger In'}
                        </button>
                        <p className="mt-1 text-xs text-teal-900">Tap as someone boards between stops. Their fare counts from the last stop passed, however late you collect it.</p>
                        <p className="mt-1 text-xs font-semibold text-teal-900">{checkIns.length === 1 ? '1 passenger waiting to pay' : `${checkIns.length} passengers waiting to pay`}</p>
                      </div>
                    )}

                    {midTripAvailable && (
                      <div>
                        <p className="mb-1 text-sm font-semibold text-slate-700">Where does the passenger board?</p>
                        <div role="group" aria-label="Boarding point" data-testid="boarding-mode" className="grid grid-cols-3 gap-2">
                          {[['checkin', 'Checked in'], ['stop', 'At a stop'], ['gps', 'Bus position now']].map(([mode, label]) => (
                            <button
                              key={mode}
                              type="button"
                              aria-pressed={cashForm.boarding_mode === mode}
                              onClick={() => setOnsiteForm((prev) => ({ ...prev, boarding_mode: mode, pending_boarding_id: '', destination_stop_id: '' }))}
                              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${cashForm.boarding_mode === mode ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {byBusPosition && (
                      <div data-testid="boarding-point-status" role="status" className={`rounded-lg border px-3 py-2 text-sm ${boardingView.good ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                        {boardingPoint.loading && !boardingPoint.response ? (
                          <p>Reading the bus position...</p>
                        ) : boardingView.good ? (
                          <p>No check-in: the fare counts from the last stop the bus has passed now ({boardingView.distanceFromOriginKm} km along). Use Passenger In as people board so a late collection does not lower the fare.</p>
                        ) : (
                          <>
                            <p className="font-semibold">The bus position can't be used right now.</p>
                            <p className="mt-0.5 text-xs">{boardingPoint.error || boardingView.message} Pick the boarding stop instead; the fare is then counted from that stop.</p>
                            <button
                              type="button"
                              className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                              onClick={() => setOnsiteForm((prev) => ({ ...prev, boarding_mode: 'stop', destination_stop_id: '' }))}
                            >
                              Pick the boarding stop
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="mt-2 block text-xs font-semibold underline"
                          onClick={refreshBoardingPoint}
                          disabled={boardingPoint.loading}
                        >
                          Refresh position
                        </button>
                      </div>
                    )}

                    {byCheckIn && (
                    <div>
                      <label htmlFor="onsite-checkin" className="mb-1 block text-sm font-semibold text-slate-700">Checked-in passenger</label>
                      <select
                        id="onsite-checkin"
                        value={cashForm.pending_boarding_id}
                        onChange={(e) => setOnsiteForm((prev) => ({ ...prev, pending_boarding_id: e.target.value, destination_stop_id: '' }))}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-slate-800 px-3 text-sm text-white outline-none focus:border-teal-500"
                      >
                        <option value="">{checkIns.length ? 'Select who is paying' : 'Nobody is waiting to pay'}</option>
                        {checkIns.map((checkIn) => (
                          <option key={`checkin-${checkIn.id}`} value={checkIn.id}>{checkInLabel(checkIn)}</option>
                        ))}
                      </select>
                    </div>
                    )}

                    {!byBusPosition && !byCheckIn && (
                    <div>
                      <label htmlFor="onsite-origin" className="mb-1 block text-sm font-semibold text-slate-700">Boarding stop</label>
                      <select
                        id="onsite-origin"
                        value={onsiteForm.origin_stop_id}
                        onChange={(e) => setOnsiteForm((prev) => ({ ...prev, origin_stop_id: e.target.value, destination_stop_id: '' }))}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-slate-800 px-3 text-sm text-white outline-none focus:border-teal-500"
                      >
                        <option value="">Select boarding stop</option>
                        {boardingStops.map((stop) => (
                          <option key={`onsite-origin-${stop.stop_id}`} value={stop.stop_id}>
                            {stopLabel(stop)}
                          </option>
                        ))}
                      </select>
                    </div>
                    )}

                    <div>
                      <label htmlFor="onsite-destination" className="mb-1 block text-sm font-semibold text-slate-700">Select Destination</label>
                      <select
                        id="onsite-destination"
                        value={onsiteForm.destination_stop_id}
                        onChange={(e) => setOnsiteForm((prev) => ({ ...prev, destination_stop_id: e.target.value }))}
                        disabled={!boardingReady}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-slate-800 px-3 text-sm text-white outline-none focus:border-teal-500 disabled:opacity-60"
                      >
                        <option value="">{boardingReady ? 'Select destination stop' : 'Choose the boarding point first'}</option>
                        {destinationOptions.map((stop) => (
                          <option key={`onsite-destination-${stop.stop_id}`} value={stop.stop_id}>
                            {byBusPosition ? stop.stop_name : stopLabel(stop)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">Passenger Type</label>
                      <select
                        value={cashForm.seat_type}
                        onChange={(e) => setOnsiteForm((prev) => ({ ...prev, seat_type: e.target.value }))}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-slate-800 px-3 text-sm text-white outline-none focus:border-teal-500"
                      >
                        <option value="seated">Regular</option>
                        {cashCapacity.standingOpen && <option value="standing">Standing</option>}
                      </select>
                      {!cashCapacity.standingOpen && (
                        <p className="mt-1 text-xs text-slate-500">Standing is offered once every seat is sold.</p>
                      )}
                    </div>


                    <div>
                      <label htmlFor="onsite-discount-type" className="mb-1 block text-sm font-semibold text-slate-700">Onsite discount</label>
                      <select
                        id="onsite-discount-type"
                        value={onsiteDiscountTypeKey}
                        onChange={(event) => { setOnsiteDiscountTypeKey(event.target.value); setOnsiteDiscountIdChecked(false); }}
                        className="h-11 w-full rounded-lg border border-slate-300 bg-slate-800 px-3 text-sm text-white outline-none focus:border-teal-500"
                      >
                        <option value="">No discount</option>
                        {onsiteDiscountTypes.map((type) => <option key={type.key} value={type.key}>{type.label} ({Math.round(Number(type.rate) * 100)}%)</option>)}
                      </select>
                      {onsiteDiscountError && <p role="status" className="mt-1 text-xs text-amber-700">{onsiteDiscountError}</p>}
                      {selectedOnsiteDiscount && (
                        <label className="mt-2 flex items-start gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={onsiteDiscountIdChecked}
                            onChange={(event) => setOnsiteDiscountIdChecked(event.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-teal-700"
                          />
                          <span>I checked the passenger&apos;s valid ID. No ID number or photo is recorded.</span>
                        </label>
                      )}
                    </div>

                    <div data-testid="onsite-fare">
                      <label htmlFor="onsite-fare-amount" className="mb-1 block text-sm font-semibold text-slate-700">Fare Amount (PHP)</label>
                      <output
                        id="onsite-fare-amount"
                        aria-live="polite"
                        className={`flex min-h-14 w-full items-center rounded-lg border px-3 py-2 ${onsiteQuote.status === 'ready' ? 'border-emerald-300 bg-emerald-50' : onsiteQuote.status === 'error' ? 'border-red-200 bg-red-50' : 'border-slate-300 bg-slate-100'}`}
                      >
                        {onsiteQuote.status === 'ready' && <span className="font-data text-3xl font-bold text-emerald-800">&#8369;{onsiteQuote.amount.toFixed(2)}</span>}
                        {onsiteQuote.status === 'loading' && <span className="text-sm text-slate-600">Working out the fare...</span>}
                        {onsiteQuote.status === 'error' && <span role="alert" className="text-sm font-semibold text-red-700">{onsiteQuote.message}</span>}
                        {onsiteQuote.status === 'idle' && <span className="text-sm text-slate-600">Select boarding point and destination first</span>}
                      </output>
                      {onsiteQuote.status === 'ready' && onsiteQuote.discountAmount > 0 && (
                        <p className="mt-1 text-xs text-slate-600" data-testid="onsite-fare-discount">
                          Regular fare &#8369;{onsiteQuote.originalAmount.toFixed(2)}, {onsiteQuote.discountLabel} discount -&#8369;{onsiteQuote.discountAmount.toFixed(2)}.
                        </p>
                      )}
                      {onsiteQuote.status === 'ready' && onsiteDiscountTypeKey && !onsiteDiscountIdChecked && (
                        <p className="mt-1 text-xs text-amber-700">Tick the ID check to see the discounted fare.</p>
                      )}
                      {byBusPosition && onsiteQuote.status === 'ready' && (
                        <p className="mt-1 text-xs text-slate-500">Without a check-in the fare follows the bus. Use Refresh position just before you sell.</p>
                      )}
                      {byCheckIn && onsiteQuote.status === 'ready' && (
                        <p className="mt-1 text-xs text-slate-500">Counted from {selectedCheckIn?.stop_name}, where this passenger was checked in.</p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={requestOnsiteCheckout}
                        disabled={checkoutInFlight || !hasActiveTrip || !isPaired || !hasOpenShift || cashCapacity.isFull || onsiteQuote.status !== 'ready' || Boolean(onsiteDiscountTypeKey && !onsiteDiscountIdChecked)}
                      >
                        {checkoutInFlight ? 'Processing...' : 'Make sale'}
                      </button>
                    </div>
                    {ticketingBlocked && <p data-testid="ticketing-reason" className="text-xs text-amber-700">{ticketingBlocked}</p>}

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

                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600" data-testid="capacity-summary">
                      <p className="font-semibold text-slate-800">On board {cashCapacity.onboard} / {cashCapacity.capacity || '-'} · Tickets sold {cashCapacity.sold} · Places left {cashCapacity.remaining ?? '-'}</p>
                      {cashCapacity.isFull && (
                        <p role="alert" data-testid="bus-full-notice" className="mt-1 font-semibold text-red-700">The bus is full. No more tickets can be issued.</p>
                      )}
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
                <DropOffGroups
                  groups={dropOffGroups}
                  passengers={passengers}
                  disabled={!isPaired}
                  disabledReason="You must be paired before you can confirm a drop-off."
                  onConfirm={handleConfirmDropOff}
                />
                {/* §7: one at a time is the exception path; the groups above are the usual way. */}
                <details className="rounded-xl border border-slate-200 bg-white p-3" open={!dropOffGroups.length}>
                  <summary className="cursor-pointer text-sm font-semibold text-slate-700">Each passenger, one at a time</summary>
                  <div className="mt-3 space-y-4">
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
                            <th className="py-3">Passenger Type</th>
                            <th className="py-3">Destination</th>
                            <th className="py-3">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.passengers.map((p, i) => {
                            return (
                              <tr key={p.ticket_id ?? `${group.key}-${i}`} className="border-b border-slate-100">
                                <td className="py-3 font-data text-slate-500">{p.row_number}</td>
                                <td className="py-3 text-slate-900">{p.passenger_name ?? p.passenger?.name ?? 'Guest'}</td>
                                <td className="py-3"><span className="rounded-full border border-slate-200 px-2 py-1 text-xs capitalize text-slate-600">{p.seat_type}</span></td>
                                <td className="py-3 text-slate-600">{p.destination_display}</td>
                                <td className="py-3">
                                  {!p.alighted_at && (
                                    <button
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                      onClick={() => handleAlight(p.ticket_id)}
                                      disabled={!isPaired}
                                      title={!isPaired ? 'You must be paired before you can mark a drop-off.' : undefined}
                                    >
                                      <UserCheck className="h-3.5 w-3.5" />
                                      Mark as dropped off
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
                </details>
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
              <div className="flex flex-wrap items-center gap-2">
                <FileTypeSelect id="summary-file-type" value={summaryFileType} onChange={setSummaryFileType} />
                <button
                  type="button"
                  onClick={() => { void downloadShiftSummary(earnings, { chauffeur: profile?.name ?? '', date: getBusinessToday() }, summaryFileType); }}
                  disabled={!earnings}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Summary Report
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-teal-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => { void refreshEndBlockedReason(); setConfirmEnd(true); }}
                  disabled={actionInFlight || !hasOpenShift || Boolean(shiftState?.endBlockedReason)}
                >
                  Verify &amp; End Shift
                </button>
                {!hasOpenShift && <p className="basis-full text-xs text-amber-700">No shift is open, so there is nothing to end.</p>}
              </div>
            </div>
            {actionMsg && <p className="mb-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-700">{actionMsg}</p>}

            {/* Stats row */}
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="staff-card">
                <p className="text-xs text-slate-400">Net Revenue{Number(earnings?.refunded_amount) > 0 ? ` (after ₱${Number(earnings.refunded_amount).toFixed(2)} refunds)` : ''}</p>
                <p className="font-data mt-1 text-xl font-bold text-slate-900">₱{earnings ? Number(earnings.net_total ?? earnings.total_fare).toFixed(2) : '0.00'}</p>
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

            {earnings?.shift && (
              <div className="staff-card mb-4" data-testid="shift-cash">
                <p className="text-xs text-slate-400">Expected cash on hand (this shift)</p>
                <p className="font-data mt-1 text-xl font-bold text-slate-900">₱{Number(earnings.shift.expected_cash).toFixed(2)}</p>
                <p className="mt-1 text-xs text-slate-500">{Number(earnings.shift.opening_cash) > 0 ? `Opening ₱${Number(earnings.shift.opening_cash).toFixed(2)} + ` : ''}Cash sales ₱{Number(earnings.shift.cash_sales).toFixed(2)} - cash refunds ₱{Number(earnings.shift.cash_refunds).toFixed(2)}</p>
              </div>
            )}
            {Array.isArray(earnings?.unpaid_check_ins) && earnings.unpaid_check_ins.length > 0 && (
              <div className="staff-card mb-4 border-amber-200 bg-amber-50" data-testid="unpaid-check-ins">
                <p className="text-sm font-bold text-amber-900">Checked in but not paid ({earnings.unpaid_check_ins.length})</p>
                <p className="mt-1 text-xs text-amber-800">These passengers were checked in on this shift and no fare was collected before the trip ended. Your Operator sees this list too.</p>
                <ul className="mt-2 space-y-1 text-sm text-amber-900">
                  {earnings.unpaid_check_ins.map((checkIn) => <li key={checkIn.id}>{checkInLabel(checkIn)}</li>)}
                </ul>
              </div>
            )}
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

        {/* Batch 45 Feature B: the former Daily PIN tab, unchanged inside the "Pair with crew" pop-up (opened from the
            Dashboard card, the Ticketing & Fares tile, or an old ?tab=pin link). */}
        <Modal open={!loading && pairingOpen} onClose={() => setPairingOpen(false)} title="Pair with crew" fullScreenOnMobile>
          <section className="space-y-4" data-testid="pair-with-crew-modal">
            <PairingScreen
              role="conductor"
              paired={isPaired}
              pairingReason={pairingReason}
              pairingOpensAt={pairing?.opensAt}
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
            role="conductor"
            profile={profile}
            loading={loading}
            twoFactor={{ enabled: twoFactorEnabled, saving: saving2fa, message: actionMsg, onChange: (enabled) => handleTwoFactorToggle({ target: { checked: enabled } }) }}
            availability={{ value: isAvailable, saving: availabilitySaving, onChange: handleToggleAvailability }}
            textMessages={textMessages}
            assignment={{
              route: todayInfo.route === 'Unavailable' ? null : todayInfo.route,
              fleet: todayInfo.plate === 'Unavailable' ? null : todayInfo.plate,
            }}
            onSignOut={handleLogout}
          />
        )}
    </StaffPortalLayout>

      {/* End Shift confirmation: the Chauffeur declares the cash handed over (Batch 29). */}
      {confirmEnd && (
        <ModalShell label="End shift" onClose={() => setConfirmEnd(false)} closeOnOverlay={false} overlayClassName="bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-bold text-slate-100">End Shift?</h3>
            <p className="mb-4 text-sm text-slate-400">Count the cash you are handing over. The Operator will confirm it later.</p>
            {endCash && (
              <dl className="mb-4 space-y-2 rounded-lg bg-slate-800 p-3 text-sm" data-testid="end-shift-cash">
                {Number(endCash.opening_cash) > 0 && <div className="flex justify-between"><dt className="text-slate-500">Opening cash</dt><dd className="font-data text-slate-100">₱{Number(endCash.opening_cash).toFixed(2)}</dd></div>}
                <div className="flex justify-between"><dt className="text-slate-500">Cash sales</dt><dd className="font-data text-slate-100">₱{Number(endCash.cash_sales).toFixed(2)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Cash refunds</dt><dd className="font-data text-slate-100">- ₱{Number(endCash.cash_refunds).toFixed(2)}</dd></div>
                <div className="flex justify-between border-t border-slate-700 pt-2"><dt className="text-slate-400">Expected cash</dt><dd className="font-data font-semibold text-slate-100">₱{Number(endCash.expected_cash).toFixed(2)}</dd></div>
              </dl>
            )}
            <label htmlFor="closing-cash" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Closing cash count (₱)</label>
            <input id="closing-cash" type="number" inputMode="decimal" min="0" step="0.01" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} aria-invalid={closingCashInvalid} placeholder="0.00" className="mb-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-teal-500" />
            <p className="mb-4 text-xs text-slate-500">Enter the amount you counted, even if it is 0.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmEnd(false)} className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button type="button" disabled={closingCashInvalid || actionInFlight} onClick={() => { setConfirmEnd(false); handleEndShift(closingCashValue); setClosingCash(''); }} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-50">End Shift</button>
            </div>
          </div>
        </ModalShell>
      )}

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
              <button type="button" onClick={() => { setConfirmStart(false); handleStartShift(); }} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-50">Start Shift <Play className="h-4 w-4" /></button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ── Onsite Checkout Confirmation Modal ─────────────────────── */}
      {confirmCheckout && (
        <ModalShell label="Record cash payment" onClose={() => setConfirmCheckout(false)} closeOnOverlay={false} overlayClassName="bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-bold text-slate-100">Save this cash payment?</h3>
            <p className="mb-4 text-sm text-slate-400">This will create a payment record. <strong className="text-amber-300">This cannot be undone.</strong></p>
            <dl className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-slate-800 p-3 text-sm">
              <div><dt className="text-xs text-slate-500">Passenger Type</dt><dd className="font-semibold text-slate-100 capitalize">{cashForm.seat_type}</dd></div>
              <div><dt className="text-xs text-slate-500">Trip ID</dt><dd className="font-semibold text-slate-100">#{trip?.trip_id}</dd></div>
              {onsiteQuote.status === 'ready' && (
                <div className="col-span-2"><dt className="text-xs text-slate-500">Fare to collect</dt><dd className="font-data text-2xl font-bold text-emerald-300">&#8369;{onsiteQuote.amount.toFixed(2)}</dd></div>
              )}
            </dl>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmCheckout(false)} className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button type="button" onClick={confirmOnsiteCheckout} className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Confirm Payment</button>
            </div>
          </div>
        </ModalShell>
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


