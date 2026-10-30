import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QrScanner from 'qr-scanner';
import ConductorService from '../../StaffService/ConductorService';
import { initFcmAndGetToken } from '../../../services/fcmService';
import { checkoutIdempotencyKey, clearCheckoutIdempotencyKey } from '../../../utils/checkoutIdempotency';
import usePassengersByTrip from './usePassengersByTrip';
import useOnsiteReceiptPrinter from './useOnsiteReceiptPrinter';
import { isSameBusinessDay, getBusinessToday, getBusinessNowMs, toBusinessScheduleMs, debugLogBusinessTime, formatManilaDateTime } from '../../../utils/dates';
import { boardingPointView, buildOnsiteItem, capacityFromServer, isMidTripBoardingAvailable, isOnsiteFormComplete, isStandingOpen } from '../../../utils/cashTicket';
import { readDeepLink } from '../../../utils/notificationTarget';
import useAssignmentCards from './useAssignmentCards';

// Architecture audit follow-up (CONF-03): ConductorDashboard.jsx previously
// called ConductorService directly from ~22 sites spread across the
// component body, with no hook layer in between. This hook now owns all of
// that; ConductorDashboard.jsx only renders, consuming the values/handlers
// this hook returns — mirrors useDriverDashboard.js / usePassengerDashboard.js.

const isSameDay = (value) => isSameBusinessDay(value);

const isCurrentOrSameDayTrip = (tripLike) => {
  if (!tripLike?.trip_id) return false;
  if (!isSameDay(tripLike?.trip_date)) return false;

  const status = String(tripLike?.status || '').toLowerCase();
  return status !== 'completed' && status !== 'cancelled';
};

const toTripScheduleMs = (tripLike) => {
  const dateValue = String(tripLike?.trip_date || '').trim();
  if (!dateValue) return Number.NaN;

  const timeRaw = String(tripLike?.departure_time || tripLike?.fleet_route?.start_time || '00:00:00').trim();
  return toBusinessScheduleMs(dateValue, timeRaw);
};

const getUpcomingTrip = (trips) => {
  const nowMs = getBusinessNowMs();

  return (trips || [])
    .filter((item) => {
      const status = String(item?.status || '').toLowerCase();
      if (status === 'completed' || status === 'cancelled') return false;

      const scheduleMs = toTripScheduleMs(item);
      if (!Number.isFinite(scheduleMs)) return false;
      return scheduleMs >= nowMs;
    })
    .sort((a, b) => toTripScheduleMs(a) - toTripScheduleMs(b))[0] || null;
};

const filterTripsByStatus = (trips, statusFilter) => {
  if (statusFilter === 'completed') {
    return (trips || []).filter((item) => String(item?.status || '').toLowerCase() === 'completed');
  }

  if (statusFilter === 'scheduled') {
    return (trips || []).filter((item) => ['scheduled', 'delayed', 'boarding', 'departed', 'in-progress'].includes(String(item?.status || '').toLowerCase()));
  }

  return trips || [];
};

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

// Batch 27: the receipt time is the server's issue time (UTC) shown in Manila time
// (formatManilaDateTime), never the device clock.

/**
 * Pairing-check bootstrap + logout, previously the top-level
 * `ConductorDashboard()` component's own state. Kept separate from
 * useConductorDashboardData() below, same split as useDriverPairing().
 */
export function useConductorPairing() {
  const navigate = useNavigate();

  const [pairing, setPairing] = useState({ loading: false, paired: false, reason: '' });
  const didInitialPairingCheck = useRef(false);
  const pairingRequestRef = useRef(null);

  const refreshPairingStatus = useCallback(async () => {
    if (pairingRequestRef.current) {
      return pairingRequestRef.current;
    }

    pairingRequestRef.current = (async () => {
      try {
        const res = await ConductorService.getPairingStatus('conductor');
        const data = res?.data ?? {};
        const nextPaired = data?.paired === true;
        const nextReason = data?.reason || '';
        const nextOpensAt = data?.pairing_opens_at || null;
        setPairing((prev) => {
          if (!prev.loading && prev.paired === nextPaired && prev.reason === nextReason && prev.opensAt === nextOpensAt) {
            return prev;
          }

          return {
            loading: false,
            paired: nextPaired,
            reason: nextReason,
            opensAt: nextOpensAt,
          };
        });
      } catch {
        setPairing((prev) => ({ ...prev, loading: false, paired: false }));
      } finally {
        pairingRequestRef.current = null;
      }
    })();

    return pairingRequestRef.current;
  }, []);

  useEffect(() => {
    if (didInitialPairingCheck.current) return;
    didInitialPairingCheck.current = true;
    void refreshPairingStatus();
  }, [refreshPairingStatus]);

  const handleLogout = async () => {
    await ConductorService.logoutConductor().catch(() => {});
    navigate('/employee/login');
  };

  return { pairing, refreshPairingStatus, handleLogout };
}

/**
 * All state, effects, and handlers for the conductor dashboard's main
 * content. `onLogout`/`pairing` come from useConductorPairing() above.
 */
export function useConductorDashboardData({ onLogout, pairing }) {
  // Batch 15, Item 7: default landing screen is the ticket scanner
  // ("Ticketing" tab, key 'occupancy') rather than the Start Shift screen —
  // assignment accept/reject remains reachable from there via the
  // pre-shift welcome/no-trip sections rendered on this same tab.
  // Batch 27, Task 1: a push tap or link may open straight onto a trip
  // (?tab=dashboard&trip=ID). Read once, as initial state.
  const [initialLink] = useState(() => readDeepLink(typeof window !== 'undefined' ? window.location.search : '', 'conductor'));
  const [activeTab, setActiveTab] = useState(initialLink.tab || 'occupancy');
  const [focusTripId, setFocusTripId] = useState(initialLink.tripId);
  const [focusBlockId, setFocusBlockId] = useState(initialLink.blockId);
  const [assignedTripFilter, setAssignedTripFilter] = useState('all');
  const [profile, setProfile] = useState(null);
  const [trip, setTrip] = useState(null);
  const [assignedTrips, setAssignedTrips] = useState([]);
  const [assignedTripsForView, setAssignedTripsForView] = useState([]);
  const [occupancy, setOccupancy] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [dropOffGroups, setDropOffGroups] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinStatus, setPinStatus] = useState('');
  const [scanUuid, setScanUuid] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [groupScanResult, setGroupScanResult] = useState(null);
  const [scannerRunning, setScannerRunning] = useState(false);
  const [scannerBusy, setScannerBusy] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [scannerStatus, setScannerStatus] = useState('');
  const [scannerPhase, setScannerPhase] = useState('idle');
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [onsiteReceipt, setOnsiteReceipt] = useState(null);
  const [onsiteForm, setOnsiteForm] = useState({
    // 'stop' = pick the boarding stop; 'gps' = the bus's own position now; 'checkin' = a Passenger In check-in (both only
    // while the bus is under way, and both counted from the last stop passed).
    boarding_mode: 'stop',
    pending_boarding_id: '',
    origin_stop_id: '',
    destination_stop_id: '',
    seat_type: 'seated',
  });
  // Task 6: the server's answer to "where is the bus on this route?" (never computed here).
  const [boardingPoint, setBoardingPoint] = useState({ loading: false, response: null, error: '' });
  // Bus-position boarding exists only while the bus is moving; otherwise the form is always stop-based.
  const midTripAvailable = isMidTripBoardingAvailable(trip?.status);
  // Standing is offered only once every seat is sold; until then (or after a seat frees up) the sale is Regular.
  const standingOpen = isStandingOpen(occupancy?.capacity_summary);
  const cashForm = {
    ...onsiteForm,
    boarding_mode: midTripAvailable ? onsiteForm.boarding_mode : 'stop',
    seat_type: standingOpen ? onsiteForm.seat_type : 'seated',
  };
  const boardingView = boardingPointView(boardingPoint.response);
  // Passenger In (2026-10-26): the check-ins of this trip still waiting for their fare, and a nonce that asks for a fresh
  // quote after a refused sale (the fare may have changed).
  const [checkIns, setCheckIns] = useState([]);
  const [checkInBusy, setCheckInBusy] = useState(false);
  const [quoteNonce, setQuoteNonce] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [saving2fa, setSaving2fa] = useState(false);
  const [checkoutInFlight, setCheckoutInFlight] = useState(false);
  const [confirmCheckout, setConfirmCheckout] = useState(false);
  const [actionInFlight, setActionInFlight] = useState(false);
  // Batch 15, Item 9: "Available" status — distinct from shift/pairing
  // state; can be toggled on even while off-shift.
  const [isAvailable, setIsAvailable] = useState(false);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [shiftState, setShiftState] = useState({ openShift: null, latestShift: null, endBlockedReason: null, loading: false });
  // Batch 18: Shift Block Hand-off System.
  const [shiftBlocks, setShiftBlocks] = useState([]);
  const [shiftBlockEligibility, setShiftBlockEligibility] = useState({});
  const [shiftBlockActionInFlight, setShiftBlockActionInFlight] = useState(false);
  // `tripDetailsModal` mirrors DriverDashboard.jsx's single-trip drill-down.
  const [tripDetailsModal, setTripDetailsModal] = useState(null);
  const isPaired = pairing?.paired === true;
  const pairingReason = pairing?.reason || 'Waiting for pairing with your Driver before live trip features unlock.';
  const hasActiveTrip = isCurrentOrSameDayTrip(trip);
  // Batch 13, Issue #1: mirrors the DriverDashboard.jsx fix — `hasActiveTrip`
  // (from /conductor/trips/current, which only resolves once a shift is
  // OPEN) can never be true before the shift starts. Using it alone to hide
  // the "trip" tab (which contains Start Shift) created a deadlock: the
  // conductor could never see the button that starts the shift that makes
  // hasActiveTrip true. Day-based check against ASSIGNED trips instead.
  const hasTodayAssignedTrip = (assignedTrips || []).some((t) => {
    const status = String(t?.status || '').toLowerCase();
    if (['completed', 'cancelled'].includes(status)) return false;
    return isSameDay(t?.trip_date);
  });
  // Trip to preview in the pre-shift "Current Trip Info" card — the live
  // `trip` state is still null at this point (no open shift yet), so fall
  // back to the matching today-assigned trip from the trips list.
  const todayAssignedTrip = trip || (assignedTrips || []).find((t) => {
    const status = String(t?.status || '').toLowerCase();
    if (['completed', 'cancelled'].includes(status)) return false;
    return isSameDay(t?.trip_date);
  }) || null;
  const hasOpenShift = Boolean(shiftState?.openShift && !shiftState?.openShift?.ended_at);
  const didBootstrap = useRef(false);
  const videoRef = useRef(null);
  const scannerStreamRef = useRef(null);
  const scannerTimerRef = useRef(null);
  const scannerBusyRef = useRef(false);
  const lastDetectedRef = useRef({ value: '', at: 0 });
  const upcomingTrip = getUpcomingTrip(assignedTrips);
  const showNoCurrentTripState = !loading && isPaired && !hasActiveTrip && !hasTodayAssignedTrip && ['dashboard', 'occupancy', 'activeShift', 'pin'].includes(activeTab);
  const routeStops = trip?.fleet_route?.route?.route_stops || trip?.fleet_route?.route?.routeStops || [];
  const groupedPassengers = usePassengersByTrip(passengers, trip);
  const filteredAssignedTrips = assignedTripFilter === 'all' ? assignedTrips : assignedTripsForView;
  const todayStart = getBusinessToday();
  debugLogBusinessTime('ConductorDashboard: assigned trips today/upcoming filter');
  const todayAssignedTrips = filteredAssignedTrips.filter((item) => isSameBusinessDay(item?.trip_date, todayStart));
  const upcomingAssignedTrips = filteredAssignedTrips.filter((item) => {
    const tripDateStr = String(item?.trip_date || '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
    return !!tripDateStr && tripDateStr > todayStart;
  });
  const { printOnsiteReceipt } = useOnsiteReceiptPrinter();

  const handleAssignedTripFilterChange = useCallback(async (value) => {
    setAssignedTripFilter(value);

    if (value === 'all') {
      setAssignedTripsForView([]);
      return;
    }

    try {
      const res = await ConductorService.getConductorTrips(value);
      setAssignedTripsForView(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setAssignedTripsForView([]);
    }
  }, []);

  const handleTwoFactorToggle = async (event) => {
    const enabled = event.target.checked;
    setTwoFactorEnabled(enabled);
    setSaving2fa(true);
    setActionMsg('');

    try {
      await ConductorService.setTwoFactorPreference(enabled, 'conductor');
      setActionMsg(enabled ? 'Extra login security is on for your account.' : 'Extra login security is off for your account.');
    } catch (err) {
      setTwoFactorEnabled(!enabled);
      setActionMsg(err?.message || 'We could not update extra login security. Please try again.');
    } finally {
      setSaving2fa(false);
    }
  };

  const stopScanner = useCallback(() => {
    if (scannerTimerRef.current) {
      clearInterval(scannerTimerRef.current);
      scannerTimerRef.current = null;
    }

    if (scannerStreamRef.current) {
      // destroy() stops scanning AND releases all camera resources
      if (typeof scannerStreamRef.current.destroy === 'function') {
        scannerStreamRef.current.destroy();
      } else if (typeof scannerStreamRef.current.stop === 'function') {
        scannerStreamRef.current.stop();
      } else if (typeof scannerStreamRef.current.getTracks === 'function') {
        scannerStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      scannerStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    scannerBusyRef.current = false;
    setScannerRunning(false);
  }, []);

  const extractTicketUuid = useCallback((rawValue) => {
    if (!rawValue) return '';

    const trimmed = String(rawValue).trim();
    const directMatch = trimmed.match(UUID_PATTERN);
    if (directMatch?.[0]) return directMatch[0];

    try {
      const url = new URL(trimmed);
      const fromQuery =
        url.searchParams.get('ticket_uuid') ||
        url.searchParams.get('uuid') ||
        url.searchParams.get('ticket');

      if (fromQuery && UUID_PATTERN.test(fromQuery)) {
        const queryMatch = fromQuery.match(UUID_PATTERN);
        return queryMatch?.[0] || '';
      }
    } catch {
      return '';
    }

    return '';
  }, []);

  // 2026-10-28: { silent: true } refreshes without the page-wide loading state. The scanner window sits inside the
  // Ticketing section, which is not drawn while loading, so a normal reload after each scan removed the camera's video
  // element and the camera went dark after one scan.
  const loadData = useCallback(async (options = {}) => {
    const silent = options?.silent === true;
    if (!silent) setLoading(true);
    setError('');
    setShiftState((prev) => ({ ...prev, loading: true }));
    try {
      const [profileRes, tripRes, tripsRes, shiftRes, shiftBlocksRes] = await Promise.allSettled([
        ConductorService.getProfile('conductor'),
        ConductorService.getConductorTrip(),
        ConductorService.getConductorTrips(),
        ConductorService.getConductorShiftStatus(),
        ConductorService.getMyShiftBlocks(),
      ]);
      if (profileRes.status === 'fulfilled') {
        const nextProfile = profileRes.value?.data;
        setProfile(nextProfile);
        if (typeof nextProfile?.user?.two_factor_enabled === 'boolean') {
          setTwoFactorEnabled(nextProfile.user.two_factor_enabled);
        }
        if (typeof nextProfile?.is_available === 'boolean') {
          setIsAvailable(nextProfile.is_available);
        }
      }
      if (tripRes.status === 'fulfilled') setTrip(tripRes.value?.data);
      if (tripsRes.status === 'fulfilled') {
        const tripsData = tripsRes.value?.data ?? [];
        setAssignedTrips(tripsData);
        if (assignedTripFilter !== 'all') {
          setAssignedTripsForView(filterTripsByStatus(tripsData, assignedTripFilter));
        }
      }
      if (shiftBlocksRes.status === 'fulfilled') {
        setShiftBlocks(Array.isArray(shiftBlocksRes.value?.data) ? shiftBlocksRes.value.data : []);
      }
      if (shiftRes.status === 'fulfilled') {
        const payload = shiftRes.value?.data ?? {};
        setShiftState({
          openShift: payload?.open_shift ?? null,
          latestShift: payload?.latest_shift ?? null,
          endBlockedReason: payload?.end_blocked_reason ?? null,
          cash: payload?.shift_cash ?? null,
          loading: false,
        });
      } else {
        setShiftState((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      setShiftState((prev) => ({ ...prev, loading: false }));
    } finally {
      setLoading(false);
    }
  }, [assignedTripFilter]);

  const loadOccupancy = useCallback(async () => {
    if (!trip?.trip_id) {
      setOccupancy(null);
      return;
    }
    try {
      const res = await ConductorService.getTripOccupancy();
      setOccupancy(res?.data);
    } catch (err) {
      setError(err.message);
    }
  }, [trip?.trip_id]);

  // Task 6: ask the server where the bus is. Called when the Chauffeur switches to "bus position", on
  // demand, and every 15 s while that mode is open (the position is only trusted for ~90 s server-side).
  const refreshBoardingPoint = useCallback(async () => {
    setBoardingPoint((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await ConductorService.getBoardingPoint();
      setBoardingPoint({ loading: false, response: res?.data ?? null, error: '' });
    } catch (err) {
      setBoardingPoint({ loading: false, response: null, error: err?.message || 'Could not read the bus position.' });
    }
  }, []);

  const loadPassengers = useCallback(async () => {
    if (!trip?.trip_id) {
      setPassengers([]);
      return;
    }
    try {
      const res = await ConductorService.getCurrentPassengers();
      const payload = res?.data;
      if (Array.isArray(payload)) {
        setPassengers(payload);
        setDropOffGroups([]);
      } else {
        setPassengers(payload?.passengers ?? []);
        // 2026-10-27 (§7): the server's destination groups.
        setDropOffGroups(Array.isArray(payload?.destination_groups) ? payload.destination_groups : []);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [trip?.trip_id]);

  const loadPin = useCallback(async () => {
    if (!trip?.trip_id) {
      return;
    }
    try {
      await ConductorService.getConductorPin();
    } catch (err) {
      setError(err.message);
    }
  }, [trip?.trip_id]);

  const loadEarnings = useCallback(async () => {
    if (!trip?.trip_id || !isPaired) {
      setEarnings(null);
      return;
    }
    try {
      const res = await ConductorService.getTripEarnings('conductor');
      setEarnings(res?.data ?? null);
    } catch {
      setEarnings(null);
    }
  }, [isPaired, trip?.trip_id]);

  useEffect(() => {
    if (didBootstrap.current) return;
    didBootstrap.current = true;
    void loadData();
  }, [loadData]);
  // 2026-10-30: register this phone for push notifications (assignments, "Message from your operator", leg time
  // changes) once on mount, as the Driver portal does. Fail-soft: initFcmAndGetToken() resolves to null when the
  // browser cannot, permission is refused or Firebase is not configured, and nothing further happens.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await initFcmAndGetToken();
      if (!cancelled && token) {
        try {
          await ConductorService.registerFcmToken(token);
        } catch {
          // Non-critical: a failed registration only means no push on this phone.
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'occupancy' && hasActiveTrip && isPaired) void loadOccupancy();
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab, hasActiveTrip, isPaired, loadOccupancy]);

  const loadCheckIns = useCallback(async () => {
    try {
      const res = await ConductorService.getCheckIns();
      setCheckIns(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setCheckIns([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'occupancy' && hasActiveTrip && isPaired && midTripAvailable) void loadCheckIns();
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab, hasActiveTrip, isPaired, midTripAvailable, loadCheckIns]);

  // Passenger In: one tap as someone boards between stops; the server keeps where the bus is, snapped back to a stop.
  const handlePassengerIn = async () => {
    if (checkInBusy) return;
    setCheckInBusy(true);
    try {
      const res = await ConductorService.checkInPassenger();
      const checkIn = res?.data;
      setActionMsg(checkIn ? `Passenger checked in at ${checkIn.checked_in_at}, fare counted from ${checkIn.stop_name}.` : 'Passenger checked in.');
      await loadCheckIns();
    } catch (err) {
      setActionMsg(err.message || 'Passenger In is not available right now.');
    } finally {
      setCheckInBusy(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      // Batch 15, Item 8: also load on the Ticketing tab (the default
      // landing screen) so the consolidated glance panel has real data
      // without requiring a visit to the Passengers tab first.
      if (['passengers', 'occupancy', 'activeShift'].includes(activeTab) && hasActiveTrip && isPaired) void loadPassengers();
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab, hasActiveTrip, isPaired, loadPassengers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'pin' && hasActiveTrip && isPaired) void loadPin();
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab, hasActiveTrip, isPaired, loadPin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Batch 15, Item 8: also load on the Ticketing tab, same reasoning
      // as the passengers effect above.
      if (['earnings', 'occupancy', 'activeShift'].includes(activeTab) && hasActiveTrip && isPaired) void loadEarnings();
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab, hasActiveTrip, isPaired, loadEarnings]);

  useEffect(() => {
    if (!['earnings', 'occupancy', 'activeShift'].includes(activeTab) || !hasActiveTrip || !isPaired) return undefined;

    const intervalId = setInterval(() => {
      void loadEarnings();
    }, 15000);

    return () => clearInterval(intervalId);
  }, [activeTab, hasActiveTrip, isPaired, loadEarnings]);

  useEffect(() => {
    if (showScannerModal) return undefined;
    const timer = setTimeout(() => {
      stopScanner();
    }, 0);
    return () => clearTimeout(timer);
  }, [showScannerModal, stopScanner]);

  // Task 6: while the Chauffeur is selling by bus position, keep the server's reading of it fresh.
  const gpsBoardingOpen = cashForm.boarding_mode === 'gps' && activeTab === 'occupancy' && hasActiveTrip && isPaired;
  useEffect(() => {
    if (!gpsBoardingOpen) return undefined;
    const first = setTimeout(() => { void refreshBoardingPoint(); }, 0);
    const intervalId = setInterval(() => { if (!document.hidden) void refreshBoardingPoint(); }, 15000);
    return () => { clearTimeout(first); clearInterval(intervalId); };
  }, [gpsBoardingOpen, refreshBoardingPoint]);

  // C7: the server decides whether End Shift is allowed (unfinished legs in the
  // shift block, trip still boarding/in transit); re-read it after any change.
  const refreshEndBlockedReason = useCallback(async () => {
    try {
      const res = await ConductorService.getConductorShiftStatus();
      setShiftState((prev) => ({ ...prev, endBlockedReason: res?.data?.end_blocked_reason ?? null, cash: res?.data?.shift_cash ?? null }));
    } catch {
      // Keep the last known state; the server still enforces the rule.
    }
  }, []);

  useEffect(() => {
    if (!hasOpenShift) return undefined;
    const intervalId = setInterval(() => { void refreshEndBlockedReason(); }, 20000);
    return () => clearInterval(intervalId);
  }, [hasOpenShift, refreshEndBlockedReason]);

  const handleStartShift = async (openingCash = 0) => {
    try {
      const res = await ConductorService.startConductorShift(openingCash);
      const shift = res?.data?.shift ?? null;
      setShiftState((prev) => ({
        ...prev,
        openShift: shift,
        latestShift: shift,
      }));
      void refreshEndBlockedReason();
      setActionMsg(res?.message || 'Chauffeur shift started');
      setActiveTab('occupancy');
    } catch (err) {
      setActionMsg(err?.message || 'Unable to start shift right now.');
    }
  };

  // Batch 15, Item 9: toggle "Available for extra assignment" — independent
  // of shift/pairing state, visible to the Operator on the staff list.
  const handleToggleAvailability = async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    setAvailabilitySaving(true);
    try {
      await ConductorService.updateConductorAvailability(next);
    } catch (err) {
      setIsAvailable(!next);
      setActionMsg(err.message);
    } finally {
      setAvailabilitySaving(false);
    }
  };

  // Batch 18: Shift Block Hand-off System.
  const checkShiftBlockEligibility = async (shiftBlockId) => {
    try {
      const res = await ConductorService.getShiftBlockHandoffEligibility(shiftBlockId);
      setShiftBlockEligibility((prev) => ({ ...prev, [shiftBlockId]: res?.data ?? null }));
    } catch {
      setShiftBlockEligibility((prev) => ({ ...prev, [shiftBlockId]: null }));
    }
  };

  const handleInitiateShiftBlockHandoff = async (shiftBlockId) => {
    setShiftBlockActionInFlight(true);
    setActionMsg('');
    try {
      await ConductorService.initiateShiftBlockHandoff(shiftBlockId);
      setActionMsg('Hand-off initiated. You will be signed out.');
      void loadData();
    } catch (err) {
      setActionMsg(err.message);
    } finally {
      setShiftBlockActionInFlight(false);
    }
  };

  const handleEndShift = async (closingCash) => {
    setActionInFlight(true);
    try {
      const res = await ConductorService.endConductorShift(closingCash);
      const shift = res?.data?.shift ?? null;
      setShiftState((prev) => ({
        ...prev,
        openShift: null,
        latestShift: shift,
      }));
      setActionMsg(res?.message || 'Chauffeur shift ended');
    } catch (err) {
      setActionMsg(err?.message || 'Unable to end shift right now.');
      void refreshEndBlockedReason();
    } finally {
      setActionInFlight(false);
    }
  };

  useEffect(() => () => stopScanner(), [stopScanner]);

  const handleScan = useCallback(async (scannedUuid = scanUuid, options = {}) => {
    const { manageBusy = true } = options;
    const ticketUuid = String(scannedUuid || '').trim();

    if (manageBusy) {
      scannerBusyRef.current = true;
      setScannerBusy(true);
    }

    if (!isPaired) {
      setScanResult({ success: false, msg: pairingReason });
      setScannerStatus('Pairing is required before scanning.');
      if (manageBusy) {
        scannerBusyRef.current = false;
        setScannerBusy(false);
      }
      return;
    }

    if (!hasOpenShift) {
      setScanResult({ success: false, msg: 'Start your shift first.' });
      setScannerStatus('Start your shift first.');
      if (manageBusy) {
        scannerBusyRef.current = false;
        setScannerBusy(false);
      }
      return;
    }

    if (!trip?.trip_id) {
      setScanResult({ success: false, msg: 'No active trip assigned. Ticket scanning is unavailable.' });
      setScannerStatus('No active trip assigned for scanning.');
      if (manageBusy) {
        scannerBusyRef.current = false;
        setScannerBusy(false);
      }
      return;
    }

    if (!ticketUuid) {
      setScanResult({ success: false, msg: 'Please enter the Ticket ID (or scan the QR code) before scanning.' });
      setScannerStatus('Please enter a Ticket ID.');
      if (manageBusy) {
        scannerBusyRef.current = false;
        setScannerBusy(false);
      }
      return;
    }

    setScannerStatus('Validating ticket...');
    setScannerPhase('validating');
    setGroupScanResult(null);
    setScanResult(null);
    try {
      const res = await ConductorService.scanTicket(ticketUuid);
      setScanResult({ success: true, data: res?.data, msg: res?.message });
      setActionMsg('Ticket scanned successfully.');
      setScanUuid(ticketUuid);
      setScannerPhase('success');
      setScannerStatus('Ticket validated. Ready for next scan.');
      void loadOccupancy();
      void loadPassengers();
      void loadEarnings();
      void loadData({ silent: true }); // keep the camera running for the next ticket
    } catch (err) {
      setScanResult({ success: false, msg: err.message });
      setScannerPhase('failed');
      setScannerStatus('Ticket validation failed. Ready for next scan.');
    } finally {
      if (manageBusy) {
        scannerBusyRef.current = false;
        setScannerBusy(false);
      }
    }
  }, [hasOpenShift, isPaired, loadEarnings, loadOccupancy, loadPassengers, loadData, pairingReason, scanUuid, trip?.trip_id]);

  const handleGroupScan = useCallback(async (transactionRef, options = {}) => {
    const { manageBusy = true } = options;
    if (manageBusy) {
      scannerBusyRef.current = true;
      setScannerBusy(true);
    }

    if (!isPaired) {
      setGroupScanResult({ success: false, msg: pairingReason });
      setScannerStatus('Pairing is required before group scanning.');
      if (manageBusy) {
        scannerBusyRef.current = false;
        setScannerBusy(false);
      }
      return;
    }

    if (!hasOpenShift) {
      setGroupScanResult({ success: false, msg: 'Start your shift first.' });
      setScannerStatus('Start your shift first.');
      if (manageBusy) {
        scannerBusyRef.current = false;
        setScannerBusy(false);
      }
      return;
    }

    if (!trip?.trip_id) {
      setGroupScanResult({ success: false, msg: 'No active trip assigned. Group scanning is unavailable.' });
      setScannerStatus('No active trip assigned for group scanning.');
      if (manageBusy) {
        scannerBusyRef.current = false;
        setScannerBusy(false);
      }
      return;
    }

    setScannerStatus('Validating group ticket...');
    setScannerPhase('validating');
    setScanResult(null);
    setGroupScanResult(null);
    try {
      const res = await ConductorService.scanGroupTickets(transactionRef);
      const outcome = String(res?.data?.scan_outcome || 'success');
      setGroupScanResult({ success: true, info: outcome === 'info_future', data: res?.data, msg: res?.message });
      if (outcome === 'info_future') {
        setActionMsg(res?.message || 'This ticket is scheduled for a future date and cannot be boarded yet.');
      } else {
        setActionMsg(`${res?.data?.boarded_count ?? 0} ticket(s) boarded.`);
      }
      setScannerPhase('success');
      setScannerStatus('Group ticket validated. Ready for next scan.');
      void loadOccupancy();
      void loadPassengers();
      void loadEarnings();
      void loadData({ silent: true }); // keep the camera running for the next ticket
    } catch (err) {
      setGroupScanResult({ success: false, msg: err.message });
      setScannerPhase('failed');
      setScannerStatus('Group ticket validation failed. Ready for next scan.');
    } finally {
      if (manageBusy) {
        scannerBusyRef.current = false;
        setScannerBusy(false);
      }
    }
  }, [hasOpenShift, isPaired, loadEarnings, loadOccupancy, loadPassengers, loadData, pairingReason, trip?.trip_id]);

  const startScanner = useCallback(async () => {
    setScannerError('');
    setScannerStatus('');
    setScannerPhase('idle');
    setScanResult(null);

    if (!trip?.trip_id) {
      setScannerError('No active trip assigned. Camera scanning is unavailable.');
      return;
    }

    if (!isPaired) {
      setScannerError(pairingReason);
      return;
    }

    if (!hasOpenShift) {
      setScannerError('Start your shift first.');
      return;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      setScannerError('Camera API is not available on this device/browser.');
      return;
    }

    if (!window.isSecureContext) {
      setScannerError('Camera access requires HTTPS or localhost. Please open this app in a secure context.');
      return;
    }

    if (!videoRef.current) {
      setScannerError('Scanner element is not ready. Please try again.');
      return;
    }

    try {
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        setScannerError('No camera device was detected for scanning.');
        return;
      }

      const cameraList = await QrScanner.listCameras(true).catch(() => []);
      const preferredCamera = cameraList.find((camera) => /back|rear|environment/i.test(String(camera?.label || '')))?.id || 'environment';

      const handleDecodedResult = async (result) => {
        const rawValue = result?.data;
        if (!rawValue) return;

        if (scannerBusyRef.current) return;          // drop scan — one already in flight
        scannerBusyRef.current = true;
        setScannerBusy(true);

        // Prevent duplicate detections within 3 seconds
        const now = Date.now();
        const isRecentDuplicate =
          lastDetectedRef.current.value === rawValue && now - lastDetectedRef.current.at < 3000;
        if (isRecentDuplicate) {
          scannerBusyRef.current = false;
          setScannerBusy(false);
          return;
        }

        lastDetectedRef.current = { value: rawValue, at: now };
        setScannerPhase('captured');
        setScannerStatus('⏳ Processing scan…');

        // Group QR path — encodes "grp:{transaction_reference}"
        if (typeof rawValue === 'string' && rawValue.startsWith('grp:')) {
          const transactionRef = rawValue.slice(4).trim();
          setScannerStatus('Group QR detected. Boarding all tickets in this order...');
          try {
              await handleGroupScan(transactionRef, { manageBusy: false });
          } finally {
            scannerBusyRef.current = false;
            setScannerBusy(false);
          }
          return;
        }

        // Single ticket path
        const parsedUuid = extractTicketUuid(rawValue);
        if (!parsedUuid) {
          setScannerStatus('QR detected, but no valid ticket UUID was found.');
          scannerBusyRef.current = false;
          setScannerBusy(false);
          return;
        }

        setScanUuid(parsedUuid);
        setScannerStatus(`QR captured: ${parsedUuid}. Validating ticket...`);
        try {
            await handleScan(parsedUuid, { manageBusy: false });
        } finally {
          scannerBusyRef.current = false;
          setScannerBusy(false);
        }
      };

      // Initialize QR Scanner with cross-browser support
      let qrScanner = new QrScanner(
        videoRef.current,
        handleDecodedResult,
        {
          onDecodeError: () => {
            setScannerStatus('Scanning... keep QR centered and well-lit.');
          },
          maxScansPerSecond: 2,
          preferredCamera,
          workerPath: '/qr-scanner-worker.min.js',
        }
      );

      try {
        // Race: abort if camera takes > 10s to initialise (e.g. pending permission dialog)
        await Promise.race([
          qrScanner.start(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Camera initialisation timed out (10s). Check camera permissions.')), 10000)
          ),
        ]);
      } catch {
        if (typeof qrScanner.destroy === 'function') qrScanner.destroy();
        qrScanner = new QrScanner(
          videoRef.current,
          handleDecodedResult,
          {
            onDecodeError: () => {
              setScannerStatus('Scanning... keep QR centered and well-lit.');
            },
            maxScansPerSecond: 2,
            preferredCamera,
          },
        );
        await Promise.race([
          qrScanner.start(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Camera initialisation timed out (10s). Check camera permissions.')), 10000)
          ),
        ]);
      }

      scannerStreamRef.current = qrScanner;

      // Guard: scanner may have been stopped while start() was awaiting (e.g. tab change)
      if (!scannerStreamRef.current) return;

      setScannerRunning(true);
      setScannerStatus('Camera is active. Point it at a ticket QR code.');
    } catch (err) {
      stopScanner();
      setScannerError(err?.message || 'Unable to access camera for QR scanning.');
    }
  }, [extractTicketUuid, handleGroupScan, handleScan, hasOpenShift, isPaired, pairingReason, stopScanner, trip?.trip_id]);

  // 2026-10-27 (§7): one action for a whole destination group (minus anyone who stayed on).
  const handleConfirmDropOff = async (group, ticketIds) => {
    if (!isPaired) {
      setActionMsg(pairingReason);
      return false;
    }
    try {
      const res = await ConductorService.confirmDropOffGroup(group.key, ticketIds);
      const confirmed = res?.data?.confirmed ?? ticketIds.length;
      setActionMsg(`${confirmed} ${confirmed === 1 ? 'passenger' : 'passengers'} got off at ${group.destination}.`);
      void loadPassengers();
      return true;
    } catch (err) {
      setActionMsg(err.message);
      void loadPassengers();
      return false;
    }
  };

  const handleAlight = async (ticketId) => {
    if (!isPaired) {
      setActionMsg(pairingReason);
      return;
    }

    try {
      await ConductorService.recordAlighting(ticketId);
      setActionMsg('Alighting recorded.');
      void loadPassengers();
    } catch (err) {
      setActionMsg(err.message);
    }
  };

  const handleVerifyPin = async () => {
    if (!isPaired) {
      setPinStatus(pairingReason);
      return;
    }

    if (!trip?.trip_id) {
      setPinStatus('No active trip assigned. PIN verification is unavailable.');
      return;
    }
    try {
      await ConductorService.verifyConductorPin(pinInput);
      setPinStatus('PIN verified successfully.');
    } catch (err) {
      setPinStatus(err.message);
    }
  };

  const handleOnsiteCheckout = async () => {
    if (!isPaired) {
      setActionMsg(pairingReason);
      return;
    }

    if (!trip?.trip_id) {
      setActionMsg('No active trip assigned. Onsite checkout is unavailable.');
      return;
    }

    if (!hasOpenShift) {
      setActionMsg('Start your shift first.');
      return;
    }

    if (!isOnsiteFormComplete(cashForm, boardingView)) {
      setActionMsg(cashForm.boarding_mode === 'checkin'
        ? 'Select the checked-in passenger who is paying, then choose the destination.'
        : cashForm.boarding_mode === 'gps'
        ? 'The bus position is not reliable right now. Pick the boarding stop instead, then choose the destination.'
        : 'Please select origin and destination stops for onsite checkout.');
      return;
    }

    setConfirmCheckout(true);
  };

  const handleConfirmedOnsiteCheckout = async (discount = null, quotedAmount = null) => {
    setConfirmCheckout(false);
    setCheckoutInFlight(true);
    try {
      const onsiteItem = buildOnsiteItem({ tripId: trip.trip_id, form: cashForm });
      // The fare the Chauffeur was shown: if the server's fare is different now, nothing is sold and it says the new fare.
      if (Number.isFinite(quotedAmount)) onsiteItem.quoted_amount = quotedAmount;
      if (discount?.discount_type_key) {
        onsiteItem.discount_type_key = discount.discount_type_key;
        onsiteItem.discount_id_checked = Boolean(discount.discount_id_checked);
      }
      const onsitePayload = { items: [onsiteItem] };
      const idempotencyKey = checkoutIdempotencyKey('conductor-cash', onsitePayload);
      const res = await ConductorService.checkoutOnsite(onsitePayload, idempotencyKey);
      clearCheckoutIdempotencyKey('conductor-cash');

      const checkoutData = res?.data ?? res ?? {};
      setOnsiteReceipt({
        payment: checkoutData?.payment || null,
        tickets: checkoutData?.tickets || [],
        createdAtLabel: formatManilaDateTime(checkoutData?.issued_at || new Date().toISOString()),
        issuedBy: checkoutData?.issued_by?.name || null,
      });

      setActionMsg('Onsite checkout recorded successfully.');
      setOnsiteForm((prev) => ({
        ...prev,
        pending_boarding_id: '',
        origin_stop_id: '',
        destination_stop_id: '',
        seat_type: 'seated',
      }));
      void loadCheckIns();
      void loadPassengers();
      void loadOccupancy();
      void loadEarnings();
      // Batch 27: refresh the trip itself so the "tickets sold" count (and the
      // full-bus block) follow the sale without a page reload.
      ConductorService.getConductorTrip().then((res) => {
        if (res?.data) setTrip(res.data);
      }).catch(() => {});
      return true;
    } catch (err) {
      setOnsiteReceipt(null);
      setActionMsg(err.message || 'Failed to record onsite checkout.');
      // The server may have refused the bus position; show its current verdict so the picker can fall back.
      if (cashForm.boarding_mode === 'gps') void refreshBoardingPoint();
      // A changed fare, or a check-in already used: ask for a fresh quote and list.
      setQuoteNonce((n) => n + 1);
      if (cashForm.boarding_mode === 'checkin') void loadCheckIns();
      return false;
    } finally {
      setCheckoutInFlight(false);
    }
  };

  const handleLogout = onLogout;

  const occSeated = Number(occupancy?.boarded?.seated ?? occupancy?.current_seated ?? 0);
  const occStanding = Number(occupancy?.boarded?.standing ?? occupancy?.current_standing ?? 0);
  const occSeatedCap = Number(occupancy?.capacity?.seated ?? occupancy?.seated_capacity ?? 0);
  const occStandingCap = Number(occupancy?.capacity?.standing ?? occupancy?.standing_capacity ?? 0);
  const occTotalCap = Number(occupancy?.capacity?.total ?? occupancy?.total_capacity ?? 0);
  const occupiedTotal = Math.max(0, occSeated + occStanding);
  // Task 5: capacity is the server's own count (`capacity_summary`, tickets sold) - the same number that
  // refuses a sale. The local count is only a fallback for a payload that does not carry it.
  const cashCapacity = capacityFromServer(occupancy?.capacity_summary, {
    capacity: occTotalCap || Number(trip?.fleet_route?.fleet?.capacity ?? 0),
    sold: trip?.total_occupancy,
    onboard: occupiedTotal,
  });

  const pageTitle =
    activeTab === 'dashboard'
      ? 'Dashboard'
      : activeTab === 'occupancy'
        ? 'Ticketing & Fares'
        : activeTab === 'activeShift'
            ? 'Active Shift'
            : activeTab === 'schedule'
              ? 'Schedule'
              : activeTab === 'pin'
                ? 'Daily PIN'
                : 'Account';

  // Batch 27, Task 1: open a trip from a notification (bell click) and clear the focus.
  // Batch 28: a block notification opens that block's card instead.
  const assignments = useAssignmentCards({ service: ConductorService, onChanged: loadData });
  const openTripFromNotification = (target) => {
    if (!target) return;
    setActiveTab(target.tab);
    setFocusTripId(target.tripId ?? null);
    setFocusBlockId(target.blockId ?? null);
  };
  const dismissTripFocus = () => {
    setFocusTripId(null);
    setFocusBlockId(null);
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  return {
    activeTab, setActiveTab,
    focusTripId, openTripFromNotification, dismissTripFocus,
    focusBlockId, assignments,
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
    availabilitySaving,
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
    assignedTrips,
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
    cashCapacity,
    pageTitle,
    handleAssignedTripFilterChange,
    handleTwoFactorToggle,
    stopScanner,
    loadData,
    loadOccupancy,
    loadEarnings,
    handleStartShift,
  refreshEndBlockedReason,
    handleToggleAvailability,
    handleEndShift,
    checkShiftBlockEligibility,
    handleInitiateShiftBlockHandoff,
    handleScan,
    handleGroupScan,
    startScanner,
    handleAlight,
    handleConfirmDropOff,
    dropOffGroups,
    handleVerifyPin,
    handleOnsiteCheckout,
    handleConfirmedOnsiteCheckout,
    handleLogout,
  };
}
