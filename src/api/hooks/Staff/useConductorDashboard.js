import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QrScanner from 'qr-scanner';
import ConductorService from '../../StaffService/ConductorService';
import usePassengersByTrip from './usePassengersByTrip';
import useOnsiteReceiptPrinter from './useOnsiteReceiptPrinter';
import { isSameBusinessDay, getBusinessToday, getBusinessNowMs, toBusinessScheduleMs, debugLogBusinessTime } from '../../../utils/dates';

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

// Used for the onsite checkout receipt's timestamp label (also displayed
// via useOnsiteReceiptPrinter's print template).
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
        setPairing((prev) => {
          if (!prev.loading && prev.paired === nextPaired && prev.reason === nextReason) {
            return prev;
          }

          return {
            loading: false,
            paired: nextPaired,
            reason: nextReason,
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
  const [activeTab, setActiveTab] = useState('occupancy');
  const [assignedTripFilter, setAssignedTripFilter] = useState('all');
  const [profile, setProfile] = useState(null);
  const [trip, setTrip] = useState(null);
  const [assignedTrips, setAssignedTrips] = useState([]);
  const [assignedTripsForView, setAssignedTripsForView] = useState([]);
  const [occupancy, setOccupancy] = useState(null);
  const [passengers, setPassengers] = useState([]);
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
    origin_stop_id: '',
    destination_stop_id: '',
    seat_type: 'seated',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [saving2fa, setSaving2fa] = useState(false);
  const [checkoutInFlight, setCheckoutInFlight] = useState(false);
  const [confirmCheckout, setConfirmCheckout] = useState(false);
  // S2 (Batch 12): decline assigned trip — mirrors DriverDashboard.jsx.
  // Holds the trip object being declined (not just a boolean) so decline
  // can be triggered per-card from the Assigned Trips list — today OR
  // upcoming — and regardless of pairing status (Batch 14).
  const [confirmDecline, setConfirmDecline] = useState(null);
  const [declineReasonCode, setDeclineReasonCode] = useState('');
  const [declineSubmitting, setDeclineSubmitting] = useState(false);
  const [actionInFlight, setActionInFlight] = useState(false);
  // Batch 15, Item 9: "Available" status — distinct from shift/pairing
  // state; can be toggled on even while off-shift.
  const [isAvailable, setIsAvailable] = useState(false);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [shiftState, setShiftState] = useState({ openShift: null, latestShift: null, loading: false });
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
  const showNoCurrentTripState = !loading && isPaired && !hasActiveTrip && !hasTodayAssignedTrip && ['trip', 'occupancy', 'passengers', 'pin'].includes(activeTab);
  const routeStops = trip?.fleet_route?.route?.route_stops || trip?.fleet_route?.route?.routeStops || [];
  const shiftStarted = hasOpenShift;
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
      setActionMsg(enabled ? '2FA enabled for your account.' : '2FA disabled for your account.');
    } catch (err) {
      setTwoFactorEnabled(!enabled);
      setActionMsg(err?.message || 'Failed to update 2FA preference.');
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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setShiftState((prev) => ({ ...prev, loading: true }));
    try {
      const [profileRes, tripRes, tripsRes, shiftRes] = await Promise.allSettled([
        ConductorService.getProfile('conductor'),
        ConductorService.getConductorTrip(),
        ConductorService.getConductorTrips(),
        ConductorService.getConductorShiftStatus(),
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
      if (shiftRes.status === 'fulfilled') {
        const payload = shiftRes.value?.data ?? {};
        setShiftState({
          openShift: payload?.open_shift ?? null,
          latestShift: payload?.latest_shift ?? null,
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
      } else {
        setPassengers(payload?.passengers ?? []);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'occupancy' && hasActiveTrip && isPaired) void loadOccupancy();
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab, hasActiveTrip, isPaired, loadOccupancy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Batch 15, Item 8: also load on the Ticketing tab (the default
      // landing screen) so the consolidated glance panel has real data
      // without requiring a visit to the Passengers tab first.
      if (['passengers', 'occupancy'].includes(activeTab) && hasActiveTrip && isPaired) void loadPassengers();
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
      if (['earnings', 'occupancy'].includes(activeTab) && hasActiveTrip && isPaired) void loadEarnings();
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab, hasActiveTrip, isPaired, loadEarnings]);

  useEffect(() => {
    if (!['earnings', 'occupancy'].includes(activeTab) || !hasActiveTrip || !isPaired) return undefined;

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

  const handleStartShift = async () => {
    try {
      const res = await ConductorService.startConductorShift();
      const shift = res?.data?.shift ?? null;
      setShiftState((prev) => ({
        ...prev,
        openShift: shift,
        latestShift: shift,
      }));
      setActionMsg(res?.message || 'Conductor shift started');
      setActiveTab('occupancy');
    } catch (err) {
      setActionMsg(err?.message || 'Unable to start shift right now.');
    }
  };

  // S2 (Batch 12): decline the assigned trip — returns it to the
  // unassigned pool for the Operator to reassign. Reason is optional.
  // Works for any status-eligible trip in the conductor's assigned list —
  // today or upcoming — and regardless of pairing status (Batch 14).
  const handleConfirmedDecline = async () => {
    const tripId = confirmDecline?.trip_id;
    if (!tripId) return;
    setDeclineSubmitting(true);
    try {
      await ConductorService.declineConductorTrip(tripId, declineReasonCode ? { reason_code: declineReasonCode } : {});
      setActionMsg('Trip declined. The Operator has been notified.');
      setConfirmDecline(null);
      setDeclineReasonCode('');
      void loadData();
    } catch (err) {
      setActionMsg(err.message);
    } finally {
      setDeclineSubmitting(false);
    }
  };

  // Batch 15, Items 1/7: explicit Accept counterpart to decline above.
  const handleAcceptTrip = async (tripToAccept) => {
    const tripId = tripToAccept?.trip_id;
    if (!tripId) return;
    setActionInFlight(true);
    try {
      await ConductorService.acceptConductorTrip(tripId);
      setActionMsg('Trip accepted.');
      void loadData();
    } catch (err) {
      setActionMsg(err.message);
    } finally {
      setActionInFlight(false);
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

  const handleEndShift = async () => {
    try {
      const res = await ConductorService.endConductorShift();
      const shift = res?.data?.shift ?? null;
      setShiftState((prev) => ({
        ...prev,
        openShift: null,
        latestShift: shift,
      }));
      setActionMsg(res?.message || 'Conductor shift ended');
    } catch (err) {
      setActionMsg(err?.message || 'Unable to end shift right now.');
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
      setScanResult({ success: false, msg: 'Please provide a ticket UUID before scanning.' });
      setScannerStatus('Please provide a ticket UUID.');
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
      void loadData();
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
      void loadData();
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

    if (!onsiteForm.origin_stop_id || !onsiteForm.destination_stop_id) {
      setActionMsg('Please select origin and destination stops for onsite checkout.');
      return;
    }

    setConfirmCheckout(true);
  };

  const handleConfirmedOnsiteCheckout = async () => {
    setConfirmCheckout(false);
    setCheckoutInFlight(true);
    try {
      const res = await ConductorService.checkoutOnsite({
        items: [
          {
            trip_id: Number(trip.trip_id),
            seat_type: onsiteForm.seat_type,
            origin_stop_id: Number(onsiteForm.origin_stop_id),
            destination_stop_id: Number(onsiteForm.destination_stop_id),
          },
        ],
      });

      const checkoutData = res?.data ?? res ?? {};
      setOnsiteReceipt({
        payment: checkoutData?.payment || null,
        tickets: checkoutData?.tickets || [],
        createdAtLabel: formatDateTime(new Date().toISOString()),
      });

      setActionMsg('Onsite checkout recorded successfully.');
      setOnsiteForm({
        origin_stop_id: '',
        destination_stop_id: '',
        seat_type: 'seated',
      });
      void loadPassengers();
      void loadOccupancy();
      void loadEarnings();
    } catch (err) {
      setOnsiteReceipt(null);
      setActionMsg(err.message || 'Failed to record onsite checkout.');
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
  const fleetType = String(trip?.fleet_route?.fleet?.fleet_type || '').toLowerCase();
  const seatsPerRow = fleetType.includes('mini') ? 3 : 4;
  const seatedCapacity = occSeatedCap > 0
    ? occSeatedCap
    : Math.max(Math.round((occTotalCap || occupiedTotal || 24) * 0.7), 16);
  const standingCapacity = occStandingCap > 0
    ? occStandingCap
    : Math.max((occTotalCap || occupiedTotal || 24) - seatedCapacity, 4);
  const seatedRows = Math.ceil(seatedCapacity / seatsPerRow);

  const buildRowSeats = (rowIndex) => {
    const base = rowIndex * seatsPerRow;
    const seats = Array.from({ length: seatsPerRow }).map((_, seatOffset) => {
      const seatNumber = base + seatOffset + 1;
      if (seatNumber > seatedCapacity) return null;
      const occupied = seatNumber <= Math.min(occSeated, seatedCapacity);
      return {
        id: `seat-${seatNumber}`,
        label: seatNumber,
        occupied,
      };
    });

    if (seatsPerRow === 4) {
      return [seats[0], seats[1], 'aisle', seats[2], seats[3]];
    }

    return [seats[0], 'aisle', seats[1], seats[2]];
  };

  const pageTitle =
    activeTab === 'trip'
      ? 'Start Shift'
      : activeTab === 'occupancy'
        ? 'Ticketing'
        : activeTab === 'passengers'
            ? 'Passengers'
            : activeTab === 'earnings'
              ? 'End of Shift'
              : 'Daily PIN';

  return {
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
    hasTodayAssignedTrip,
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
    fleetType,
    seatsPerRow,
    seatedCapacity,
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
    handleGroupScan,
    startScanner,
    handleAlight,
    handleVerifyPin,
    handleOnsiteCheckout,
    handleConfirmedOnsiteCheckout,
    handleLogout,
  };
}
