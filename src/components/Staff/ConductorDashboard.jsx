import {
  AlertCircle,
  BarChart3,
  Bus,
  Camera,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  KeyRound,
  LogOut,
  Play,
  QrCode,
  RefreshCw,
  Ticket,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import PairingScreen from './PairingScreen';
import { useConductorPairing, useConductorDashboardData } from '../../api/hooks/Staff/useConductorDashboard';

const NAV_ITEMS = [
  { key: 'trip', label: 'Start', icon: Play },
  { key: 'assigned', label: 'Assigned Routes', icon: Calendar },
  { key: 'occupancy', label: 'Ticketing', icon: Ticket },
  { key: 'earnings', label: 'End Shift', icon: BarChart3 },
  { key: 'passengers', label: 'Passengers', icon: Users },
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
    <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      {trips.length === 0 ? (
        <article className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        </article>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {trips.map((item) => {
            // Batch 14: decline must be reachable from this list — today OR
            // upcoming — regardless of pairing status.
            const canDecline = ['scheduled', 'delayed', 'boarding'].includes(String(item?.status || '').toLowerCase());
            return (
              <article key={item.trip_id} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-100">Trip #{item.trip_id}</h3>
                  <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs text-sky-300">{item.status}</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-slate-500">Schedule</span><strong className="font-data text-slate-100">{formatTripSchedule(item)}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Fleet</span><strong className="text-slate-100">{item.fleet_route?.fleet?.plate_number || `Fleet ${item.fleet_route?.fleet_id || '-'}`}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Route</span><strong className="text-slate-100">{item.fleet_route?.route?.route_name || `Route ${item.fleet_route?.route_id || '-'}`}</strong></div>
                </div>
                {canDecline && (
                  <div className="mt-4 flex gap-2">
                    {!item?.conductor_accepted_at && (
                      <button
                        type="button"
                        className="flex-1 rounded-lg border border-emerald-900/60 bg-emerald-950/20 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-950/40"
                        onClick={() => onAcceptTrip?.(item)}
                      >
                        Accept
                      </button>
                    )}
                    <button
                      type="button"
                      className="flex-1 rounded-lg border border-red-900/60 bg-red-950/20 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-950/40"
                      onClick={() => onDeclineTrip?.(item)}
                    >
                      Decline
                    </button>
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
    declineReasonCode, setDeclineReasonCode,
    declineSubmitting,
    actionInFlight,
    isAvailable,
    availabilitySaving,
    shiftState,
    videoRef,
    isPaired,
    pairingReason,
    hasActiveTrip,
    todayAssignedTrip,
    hasOpenShift,
    upcomingTrip,
    showNoCurrentTripState,
    routeStops,
    shiftStarted,
    groupedPassengers,
    filteredAssignedTrips,
    todayAssignedTrips,
    upcomingAssignedTrips,
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
    handleToggleAvailability,
    handleEndShift,
    handleScan,
    startScanner,
    handleAlight,
    handleVerifyPin,
    handleOnsiteCheckout,
    handleConfirmedOnsiteCheckout,
    handleLogout,
  } = useConductorDashboardData({ onLogout, pairing });

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-100 lg:grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="flex flex-col justify-between bg-[#0D1B2A] p-4 lg:min-h-screen">
        <div>
          {/* Brand */}
          <div className="mb-2 px-2 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bus Operator</p>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 shrink-0">
                <Bus className="h-4 w-4 text-white" />
              </div>
              <p className="text-sm font-bold text-white leading-tight">Chauffeur Portal</p>
            </div>
          </div>

          <div className="my-3 border-t border-white/10" />

          <nav className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-500 text-white'
                      : 'text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                  onClick={() => {
                    setActiveTab(item.key);
                    setActionMsg('');
                    setScanResult(null);
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: profile + logout */}
        <div className="space-y-3">
          {profile && (
            <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500 text-sm font-bold text-white">
                {(profile.name || 'C')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{profile.name}</p>
                <p className="text-xs text-slate-400">Chauffeur</p>
              </div>
            </div>
          )}
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-400 hover:bg-white/10 hover:text-red-300 transition"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="min-h-screen bg-white p-4 sm:p-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
            <p className="text-xs text-slate-500">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                hasOpenShift
                  ? 'border-teal-200 bg-teal-50 text-teal-700'
                  : 'border-slate-200 bg-slate-100 text-slate-500'
              }`}
            >
              {shiftState.loading ? 'Checking shift...' : hasOpenShift ? 'Shift Active' : 'Shift Not Started'}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                pairing.loading
                  ? 'border-slate-200 bg-slate-100 text-slate-500'
                  : isPaired
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}
            >
              {pairing.loading ? 'Checking...' : isPaired ? '● Paired' : '○ Not paired'}
            </span>
            <button
              type="button"
              onClick={handleToggleAvailability}
              disabled={availabilitySaving}
              title="Available for extra/ad-hoc assignment — independent of shift or pairing state"
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60 ${
                isAvailable
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {isAvailable ? 'Available' : 'Not Available'}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={loadData}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            {actionMsg && <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{actionMsg}</span>}
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
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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

        {!loading && ['trip', 'occupancy'].includes(activeTab) && !isPaired && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="text-lg font-bold text-amber-800">Pairing required to start shift</h3>
            <p className="mt-2 text-sm text-amber-700">{pairingReason}</p>
          </section>
        )}

        {!loading && (activeTab === 'trip' || (activeTab === 'occupancy' && !hasActiveTrip)) && isPaired && !showNoCurrentTripState && (
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
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Fleet card */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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

            {/* Start shift button */}
            <div className="mt-6 text-center">
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-8 py-3 text-sm font-bold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleStartShift}
                disabled={shiftStarted}
              >
                {shiftStarted ? 'SHIFT STARTED' : 'CONFIRM & START SHIFT'}
                <Play className="h-4 w-4" />
              </button>
              <p className="mt-3 text-xs text-slate-400">This will take you to the Ticketing screen</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                {['scheduled', 'delayed', 'boarding'].includes(String(todayAssignedTrip?.status || '').toLowerCase()) && !todayAssignedTrip?.conductor_accepted_at && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                    onClick={() => handleAcceptTrip(todayAssignedTrip)}
                    disabled={actionInFlight}
                  >
                    ✓ Accept This Trip
                  </button>
                )}
                {['scheduled', 'delayed', 'boarding'].includes(String(todayAssignedTrip?.status || '').toLowerCase()) && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    onClick={() => setConfirmDecline(todayAssignedTrip)}
                    disabled={actionInFlight}
                  >
                    ✕ Decline This Trip
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {!loading && activeTab === 'assigned' && (
          <section className="grid gap-4 md:grid-cols-2">
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
              <article className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 p-6">
                <h3 className="text-lg font-semibold text-slate-100">No Assigned Trips</h3>
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

        {!loading && activeTab === 'occupancy' && !isPaired && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="text-lg font-bold text-amber-800">Ticketing is locked</h3>
            <p className="mt-2 text-sm text-amber-700">{pairingReason}</p>
          </section>
        )}

        {!loading && activeTab === 'occupancy' && isPaired && !showNoCurrentTripState && (
          <section className="max-w-5xl">
            {/* Bus + Passenger Load Header */}
            {occupancy && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <p className="text-2xl font-bold text-slate-900">
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
              <button type="button" onClick={() => setActiveTab('earnings')} className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:bg-slate-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Earnings So Far</p>
                <p className="font-data mt-1 text-lg font-bold text-slate-900">₱{earnings ? Number(earnings.total_fare).toFixed(2) : '0.00'}</p>
              </button>
              <button type="button" onClick={() => setActiveTab('passengers')} className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:bg-slate-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Passengers Onboard</p>
                <p className="font-data mt-1 text-lg font-bold text-slate-900">{passengers?.length ?? earnings?.passenger_count ?? 0}</p>
              </button>
              <button type="button" onClick={() => setActiveTab('pin')} className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:bg-slate-50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Daily PIN</p>
                <p className="mt-1 text-sm font-semibold text-teal-600">View / Verify →</p>
              </button>
            </div>
            {!occupancy ? (
              <article className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-bold text-slate-900">No Occupancy Data</h3>
              </article>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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

                      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
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

                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowScannerModal(false)}>
                <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
                          disabled={!hasOpenShift}
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
                        className="aspect-video w-full bg-slate-950 object-cover"
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
                    <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">
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
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
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
              </div>
            )}
          </section>
        )}

        {!loading && activeTab === 'passengers' && !isPaired && (
          <section className="rounded-2xl border border-amber-800 bg-amber-950/20 p-6">
            <h3 className="text-lg font-semibold text-amber-300">Passengers and alighting are locked</h3>
            <p className="mt-2 text-sm text-amber-200/90">{pairingReason}</p>
          </section>
        )}

        {!loading && activeTab === 'passengers' && isPaired && !showNoCurrentTripState && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            {groupedPassengers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-6">
                <h3 className="text-lg font-semibold text-slate-100">No Passengers</h3>
                <p className="mt-2 text-sm text-slate-500">No passengers currently on this trip.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedPassengers.map((group) => (
                  <div key={`passenger-group-${group.key}`} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-100">
                        Trip #{group.tripId}
                      </h3>
                      <div className="text-xs text-slate-400">
                        {group.routeName ? `${group.routeName} • ` : ''}
                        {group.passengers.length} passenger(s)
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-180 text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-800 text-xs uppercase tracking-[0.16em] text-slate-500">
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
                              <tr key={p.ticket_id ?? `${group.key}-${i}`} className="border-b border-slate-800/70">
                                <td className="py-3 font-data text-slate-400">{p.row_number}</td>
                                <td className="py-3 text-slate-100">{p.passenger_name ?? p.passenger?.name ?? 'Guest'}</td>
                                <td className="py-3"><span className="rounded-full border border-slate-700 px-2 py-1 text-xs capitalize text-slate-300">{p.seat_type}</span></td>
                                <td className="py-3 text-slate-300">{p.destination_display}</td>
                                <td className="py-3"><span className="rounded-full border border-emerald-900 bg-emerald-950/30 px-2 py-1 text-xs capitalize text-emerald-300">{status}</span></td>
                                <td className="py-3">
                                  {!p.alighted_at && (
                                    <button
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500"
                                      onClick={() => handleAlight(p.ticket_id)}
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

        {!loading && activeTab === 'earnings' && !isPaired && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="text-lg font-bold text-amber-800">End Shift locked</h3>
            <p className="mt-2 text-sm text-amber-700">{pairingReason}</p>
          </section>
        )}

        {!loading && activeTab === 'earnings' && isPaired && showNoCurrentTripState && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">No active trip. Shift summary is available during an active trip.</div>
        )}

        {!loading && activeTab === 'earnings' && isPaired && !showNoCurrentTripState && (
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
                  className="rounded-lg bg-teal-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-600"
                  onClick={handleEndShift}
                >
                  Verify &amp; End Shift
                </button>
              </div>
            </div>
            {actionMsg && <p className="mb-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-700">{actionMsg}</p>}

            {/* Stats row */}
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-400">Total Revenue</p>
                <p className="font-data mt-1 text-xl font-bold text-slate-900">₱{earnings ? Number(earnings.total_fare).toFixed(2) : '0.00'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-400">Fare Collected</p>
                <p className="font-data mt-1 text-xl font-bold text-slate-900">₱{earnings ? Number(earnings.onsite_amount).toFixed(2) : '0.00'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-400">Digital Payments</p>
                <p className="font-data mt-1 text-xl font-bold text-slate-900">₱{earnings ? Number(earnings.online_amount).toFixed(2) : '0.00'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-400">Passengers</p>
                <p className="font-data mt-1 text-xl font-bold text-slate-900">{earnings?.passenger_count ?? 0}</p>
              </div>
            </div>

            {/* Trip breakdown */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
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
              <article className="max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
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
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <h4 className="mb-3 text-base font-semibold text-slate-100">Profile Information</h4>
              <div className="mb-4 flex flex-col items-center rounded-xl border border-slate-800 bg-slate-950 p-4 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-emerald-600 to-teal-600 text-2xl font-bold text-white">
                  {(profile?.name || 'C')[0].toUpperCase()}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-100">{profile?.name || 'Conductor'}</h3>
                <p className="text-xs text-slate-500">Verified Conductor</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-slate-500">Email</span><strong className="text-slate-100">{profile?.user?.email || profile?.email || '-'}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Conductor ID</span><strong className="font-data text-slate-100">{profile?.company_user_id || '-'}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Status</span><strong className="text-emerald-300">Active</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Shift Started</span><strong className="font-data text-slate-100">{formatDateTime(shiftState?.latestShift?.started_at)}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Shift Ended</span><strong className="font-data text-slate-100">{formatDateTime(shiftState?.latestShift?.ended_at)}</strong></div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <h4 className="mb-3 text-base font-semibold text-slate-100">Security & 2FA</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Two-Factor Authentication</span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={twoFactorEnabled}
                      onChange={handleTwoFactorToggle}
                      disabled={saving2fa}
                    />
                    <div className="h-6 w-11 rounded-full bg-slate-600 transition-colors peer-checked:bg-emerald-500 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
                  </label>
                </div>
                {actionMsg && (
                  <p className={`text-xs ${actionMsg.includes('enabled') ? 'text-emerald-400' : 'text-sky-400'}`}>
                    {actionMsg}
                  </p>
                )}
              </div>
            </article>
          </section>
        )}
      </main>

      {/* ── Onsite Checkout Confirmation Modal ─────────────────────── */}
      {confirmCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
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
        </div>
      )}

      {/* ── S2 (Batch 12): Decline Trip Confirmation Modal ─────────────── */}
      {confirmDecline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="mb-2 text-base font-bold text-slate-100">Decline This Trip?</h3>
            <p className="mb-3 text-sm text-slate-300">
              {confirmDecline?.fleet_route?.route?.origin || '-'} → {confirmDecline?.fleet_route?.route?.destination || '-'} · {formatTripSchedule(confirmDecline)}
            </p>
            <p className="mb-4 text-sm text-slate-400">
              The trip will return to the unassigned pool and the Operator will be notified to find a replacement.
            </p>
            <label className="mb-4 block text-sm text-slate-300">
              Reason (optional)
              <select
                value={declineReasonCode}
                onChange={(e) => setDeclineReasonCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-500"
              >
                <option value="">No reason given</option>
                <option value="sick">Sick</option>
                <option value="vehicle_issue">Vehicle issue</option>
                <option value="schedule_conflict">Schedule conflict</option>
                <option value="other">Other</option>
              </select>
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setConfirmDecline(null); setDeclineReasonCode(''); }} className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800" disabled={declineSubmitting}>Cancel</button>
              <button type="button" onClick={handleConfirmedDecline} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60" disabled={declineSubmitting}>{declineSubmitting ? 'Declining...' : 'Yes, Decline'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
