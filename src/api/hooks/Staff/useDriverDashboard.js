import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DriverService from '../../StaffService/DriverService';
import { haversineM } from '../../../utils/geo';
import { isSameBusinessDay, getBusinessToday, getBusinessNowMs, toBusinessScheduleMs, debugLogBusinessTime } from '../../../utils/dates';
import { fetchTrafficStatus } from '../../../services/trafficService';
import { initFcmAndGetToken } from '../../../services/fcmService';

// Architecture audit follow-up (CONF-03): DriverDashboard.jsx previously
// called DriverService directly from ~24 sites spread across the
// component body, with no hook layer in between (component owned all
// state/effects/network calls itself). This hook now owns all of that;
// DriverDashboard.jsx only renders, consuming the values/handlers this
// hook returns — mirrors the existing usePassengerDashboard.js pattern.

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

const deriveJourneyProgressFromStops = (stops = [], tripStatus) => {
  const normalized = (Array.isArray(stops) ? stops : [])
    .map((stop, idx) => ({
      ...stop,
      sequence: Number(stop?.sequence_number ?? stop?.stop_order ?? idx + 1),
      is_acknowledged: Boolean(stop?.is_acknowledged),
    }))
    .sort((a, b) => a.sequence - b.sequence);

  const totalStops = normalized.length;
  const status = String(tripStatus || '').toLowerCase();

  if (totalStops === 0) {
    return {
      totalStops: 0,
      completedStops: status === 'completed' ? 1 : 0,
      progressPercent: status === 'completed' ? 100 : 0,
      nextStopName: null,
    };
  }

  const acknowledgedCount = normalized.filter((stop) => stop.is_acknowledged).length;
  const completedStops = status === 'completed' ? totalStops : acknowledgedCount;
  const clampedCompleted = Math.max(0, Math.min(totalStops, completedStops));
  const progressPercent = totalStops > 0
    ? Math.round((clampedCompleted / totalStops) * 100)
    : 0;
  const nextStop = normalized.find((stop) => !stop.is_acknowledged) ?? null;

  return {
    totalStops,
    completedStops: clampedCompleted,
    progressPercent,
    nextStopName: nextStop?.stop_name ?? nextStop?.name ?? null,
  };
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

// Batch 15, Item 5: builds a 6-row (42-cell) month grid starting on Sunday,
// including the trailing/leading days from adjacent months needed to fill
// whole weeks — a standard calendar-grid layout. `tripsByDate` maps a
// 'YYYY-MM-DD' key to the trips scheduled that day.
const buildCalendarGrid = (monthDate, tripsByDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const dateKey = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
    return {
      date: cellDate,
      dateKey,
      isCurrentMonth: cellDate.getMonth() === month,
      isToday: dateKey === getBusinessToday(),
      trips: tripsByDate[dateKey] || [],
    };
  });
};

/**
 * Pairing-check bootstrap + polling, previously the top-level
 * `DriverDashboard()` component's own state. Kept separate from
 * useDriverDashboardData() below since it wraps the inner dashboard and
 * runs even before pairing/trip data would make sense to load.
 */
export function useDriverPairing() {
  const navigate = useNavigate();

  // Start loading:false so the badge never flashes "Checking pairing..." on
  // initial mount; the first API call fills in the real state within ~1 s.
  const [pairing, setPairing] = useState({ loading: false, paired: false, reason: '' });
  const didInitialPairingCheck = useRef(false);
  const pairingRequestRef = useRef(null);

  const refreshPairingStatus = useCallback(async () => {
    if (pairingRequestRef.current) {
      return pairingRequestRef.current;
    }

    pairingRequestRef.current = (async () => {
      try {
        const res = await DriverService.getPairingStatus('driver');
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

  useEffect(() => {
    if (pairing.paired) {
      return undefined;
    }
    const timer = setInterval(() => {
      if (!document.hidden && navigator.onLine) {
        void refreshPairingStatus();
      }
    }, 90000); // Poll every 90 seconds while unpaired.

    return () => clearInterval(timer);
  }, [pairing.paired, refreshPairingStatus]);

  const handleLogout = async () => {
    await DriverService.logoutDriver().catch(() => {});
    navigate('/employee/login');
  };

  return { pairing, refreshPairingStatus, handleLogout };
}

/**
 * All state, effects, and handlers for the driver dashboard's main content
 * (everything DriverDashboardInner renders). `onLogout`/`pairing`/
 * `refreshPairingStatus` come from useDriverPairing() above, passed down
 * unchanged — this hook only derives `handleLogout` from `onLogout`.
 */
export function useDriverDashboardData({ onLogout, pairing }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [assignedTripFilter, setAssignedTripFilter] = useState('all');
  const [profile, setProfile] = useState(null);
  const [trip, setTrip] = useState(null);
  const [assignedTrips, setAssignedTrips] = useState([]);
  const [assignedTripsForView, setAssignedTripsForView] = useState([]);
  const [stops, setStops] = useState([]);
  const [pin, setPin] = useState(null);
  const [showTripPin, setShowTripPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinStatus, setPinStatus] = useState('');
  const [earnings, setEarnings] = useState(null);
  const [shiftState, setShiftState] = useState({ openShift: null, latestShift: null, loading: false });
  const [tripDetailsModal, setTripDetailsModal] = useState(null); // suggestion: trip info modal
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [actionInFlight, setActionInFlight] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  // S2 (Batch 12): decline assigned trip — plain decline, reason code optional.
  // Holds the trip object being declined (not just a boolean) so decline can
  // be triggered per-row from the Assigned Trips list — today OR upcoming —
  // per Batch 14 request: decline must work regardless of pairing status
  // and regardless of whether the trip is scheduled today or in the future.
  const [confirmDecline, setConfirmDecline] = useState(null);
  const [declineReasonCode, setDeclineReasonCode] = useState('');
  const [declineSubmitting, setDeclineSubmitting] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [saving2fa, setSaving2fa] = useState(false);
  const [msg2fa, setMsg2fa] = useState('');
  // Batch 15, Item 4: "Available" status — distinct from shift/pairing
  // state; can be toggled on even while off-shift.
  const [isAvailable, setIsAvailable] = useState(false);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  // Batch 15, Item 5: month currently shown in the Calendar view.
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [gpsActive, setGpsActive] = useState(false);
  const [lastGps, setLastGps] = useState(null);
  const [trafficStatus, setTrafficStatus] = useState({
    level: 'normal',
    label: 'Normal flow',
    etaMinutes: 8,
    delayMinutes: 0,
    suggestion: 'Continue current route and keep monitoring the next stop.',
  });
  const isPaired = pairing?.paired === true;
  const pairingReason = pairing?.reason || 'Waiting for pairing with your Conductor before enabling session-synced features.';
  const hasActiveTrip = isCurrentOrSameDayTrip(trip);
  // Batch 13, Issue #1: `hasActiveTrip` (derived from /driver/trips/current,
  // which only resolves once a shift is OPEN) can never be true before the
  // driver starts their shift — using it to gate the Start Shift button (or
  // the tabs that contain it) created a deadlock: no shift can start
  // because the button/section that starts it was hidden until a shift
  // already existed. This is a day-based (not time-based) check against the
  // driver's ASSIGNED trips, independent of whether a shift is open yet.
  const hasTodayAssignedTrip = (assignedTrips || []).some((t) => {
    const status = String(t?.status || '').toLowerCase();
    if (['completed', 'cancelled'].includes(status)) return false;
    return isSameDay(t?.trip_date);
  });
  // S2 (Batch 12) decline needs a trip reference even before a shift is
  // open (trip/`getCurrentTrip()` is null until then) — fall back to the
  // matching today-assigned trip from the trips list, same as Conductor.
  const todayAssignedTrip = trip || (assignedTrips || []).find((t) => {
    const status = String(t?.status || '').toLowerCase();
    if (['completed', 'cancelled'].includes(status)) return false;
    return isSameDay(t?.trip_date);
  }) || null;
  const hasOpenShift = Boolean(shiftState?.openShift && !shiftState?.openShift?.ended_at);
  const didBootstrap = useRef(false);
  const stopsLoadedRef = useRef(false);
  const upcomingTrip = getUpcomingTrip(assignedTrips);
  const gpsIntervalRef = useRef(null);
  const gpsWatchRef = useRef(null);
  const lastGpsRef = useRef(null);
  const lastSentGpsRef = useRef(null); // tracks last successfully sent position for deduplication
  const [proximityAlert, setProximityAlert] = useState(null); // { stop_name, count } | null
  const showNoCurrentTripState = !loading && isPaired && !hasActiveTrip && !hasTodayAssignedTrip && ['dashboard', 'journey', 'navigation', 'trip'].includes(activeTab);

  const currentRoute = trip?.fleet_route?.route;
  const currentFleet = trip?.fleet_route?.fleet;
  const nextStop = stops.find((stop) => !stop.is_acknowledged) ?? null;
  const filteredAssignedTrips = assignedTripFilter === 'all' ? assignedTrips : assignedTripsForView;
  const todayStart = getBusinessToday();
  debugLogBusinessTime('DriverDashboard: assigned trips today/upcoming filter');
  const todayAssignedTrips = filteredAssignedTrips.filter((item) => isSameBusinessDay(item?.trip_date, todayStart));
  const upcomingAssignedTrips = filteredAssignedTrips.filter((item) => {
    const tripDateStr = String(item?.trip_date || '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
    return !!tripDateStr && tripDateStr > todayStart;
  });

  // Batch 15, Items 5/6: Calendar and Schedule views both derive from the
  // full `assignedTrips` list (today + upcoming + past), independent of
  // the "Assigned Routes" tab's own scheduled/completed filter above.
  const tripsByDate = assignedTrips.reduce((acc, item) => {
    const dateKey = String(item?.trip_date || '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
    if (!dateKey) return acc;
    (acc[dateKey] ??= []).push(item);
    return acc;
  }, {});
  const calendarDays = buildCalendarGrid(calendarMonth, tripsByDate);
  const scheduleTripsSorted = [...assignedTrips].sort((a, b) => String(a?.trip_date || '').localeCompare(String(b?.trip_date || '')));
  const scheduleUpcoming = scheduleTripsSorted.filter((item) => String(item?.trip_date || '') >= todayStart);
  const schedulePast = scheduleTripsSorted.filter((item) => String(item?.trip_date || '') < todayStart).reverse();

  const handleAssignedTripFilterChange = useCallback(async (value) => {
    setAssignedTripFilter(value);

    if (value === 'all') {
      setAssignedTripsForView([]);
      return;
    }

    try {
      const res = await DriverService.getDriverTrips(value);
      setAssignedTripsForView(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setAssignedTripsForView([]);
    }
  }, []);

  const stopProgress = deriveJourneyProgressFromStops(stops, trip?.status);
  const tripProgress = stopProgress.progressPercent;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setShiftState((prev) => ({ ...prev, loading: true }));
    try {
      const [profileRes, tripRes, tripsRes, shiftRes] = await Promise.allSettled([
        DriverService.getProfile('driver'),
        DriverService.getCurrentTrip(),
        DriverService.getDriverTrips(),
        DriverService.getDriverShiftStatus(),
      ]);
      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value?.data);
        if (typeof profileRes.value?.data?.user?.two_factor_enabled === 'boolean') {
          setTwoFactorEnabled(profileRes.value.data.user.two_factor_enabled);
        }
        if (typeof profileRes.value?.data?.is_available === 'boolean') {
          setIsAvailable(profileRes.value.data.is_available);
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
      setError('Failed to load dashboard data.');
      setShiftState((prev) => ({ ...prev, loading: false }));
    } finally {
      setLoading(false);
    }
  }, [assignedTripFilter]);

  const loadStops = useCallback(async () => {
    if (!isPaired || !hasActiveTrip) {
      setStops([]);
      stopsLoadedRef.current = false;
      return;
    }
    try {
      const res = await DriverService.getCurrentTripStops();
      const payload = res?.data ?? null;
      if (Array.isArray(payload)) {
        setStops(payload);
      } else {
        setStops(payload?.stops ?? []);
      }
      stopsLoadedRef.current = true;
    } catch (err) {
      setError(err.message);
    }
  }, [hasActiveTrip, isPaired]);

  const loadPin = useCallback(async () => {
    if (!isPaired || !hasActiveTrip) {
      setPin(null);
      setShowTripPin(false);
      return;
    }
    try {
      const res = await DriverService.getDriverPin();
      setPin(res?.data);
    } catch (err) {
      setError(err.message);
    }
  }, [hasActiveTrip, isPaired]);

  const loadEarnings = useCallback(async () => {
    if (!isPaired || !hasActiveTrip) {
      setEarnings(null);
      return;
    }
    try {
      const res = await DriverService.getTripEarnings('driver');
      setEarnings(res?.data ?? null);
    } catch {
      setEarnings(null);
    }
  }, [hasActiveTrip, isPaired]);

  useEffect(() => {
    if (didBootstrap.current) return;
    didBootstrap.current = true;
    void loadData();
  }, [loadData]);

  // Batch 15, Item 2: register for push notifications (new trip assignment
  // alerts) once on mount. Fail-soft — initFcmAndGetToken() resolves to
  // null on any failure (unsupported browser, permission denied, missing
  // config) and this effect simply does nothing further in that case.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await initFcmAndGetToken();
      if (!cancelled && token) {
        try {
          await DriverService.registerFcmToken(token);
        } catch {
          // Non-critical — silently ignore, matches FcmService's fail-soft design.
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── GPS push: runs only while driver has an active same-day trip ────────────
  useEffect(() => {
    if (!isPaired || !hasActiveTrip) {
      // Clean up any running watcher/interval when trip becomes inactive
      if (gpsWatchRef.current !== null) {
        navigator.geolocation?.clearWatch(gpsWatchRef.current);
        gpsWatchRef.current = null;
      }
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
      lastGpsRef.current = null;
      lastSentGpsRef.current = null;
      return;
    }

    if (!navigator.geolocation) return;

    const pushLocation = (position) => {
      const { latitude, longitude, heading, speed } = position.coords;
      const nextLocation = {
        latitude,
        longitude,
        heading: Number.isFinite(heading) ? heading : undefined,
        speed_kmh: Number.isFinite(speed) ? Number((speed * 3.6).toFixed(1)) : undefined,
      };
      lastGpsRef.current = nextLocation;
      setLastGps(nextLocation);
      setGpsActive(true);
    };

    // Watch position continuously so lastGpsRef stays fresh
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      pushLocation,
      () => {
        setGpsActive(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    // Push to backend every 10 seconds — only if moved > 30m since last send.
    // Backoff: after 3 consecutive failures pause 30s before retrying.
    const MIN_DISTANCE_M = 30;
    let consecutiveFailures = 0;
    let backoffUntil = 0;
    const sendPing = async () => {
      if (!lastGpsRef.current) return;
      if (Date.now() < backoffUntil) return; // in backoff window — skip
      const last = lastSentGpsRef.current;
      if (last) {
        const dLat = lastGpsRef.current.latitude - last.latitude;
        const dLng = lastGpsRef.current.longitude - last.longitude;
        const approxMeters = Math.sqrt(dLat * dLat + dLng * dLng) * 111320;
        if (approxMeters < MIN_DISTANCE_M) return; // haven't moved enough — skip
      }
      try {
        await DriverService.updateLocation(
          lastGpsRef.current.latitude,
          lastGpsRef.current.longitude,
          lastGpsRef.current.heading ?? null,
          lastGpsRef.current.speed_kmh ?? null,
        );
        lastSentGpsRef.current = { latitude: lastGpsRef.current.latitude, longitude: lastGpsRef.current.longitude };
        consecutiveFailures = 0; // reset on success
      } catch {
        consecutiveFailures++;
        if (consecutiveFailures >= 3) {
          backoffUntil = Date.now() + 30000; // pause 30s after 3 failures
          consecutiveFailures = 0;
        }
      }
    };

    void sendPing();
    gpsIntervalRef.current = setInterval(() => { void sendPing(); }, 10000);
    return () => {
      navigator.geolocation?.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    };
  }, [hasActiveTrip, isPaired]);

  useEffect(() => {
    // Fetch stops once per active trip — not on every tab switch.
    // Re-fetch is triggered explicitly by handleAcknowledgeStop.
    if (!hasActiveTrip || !isPaired) {
      stopsLoadedRef.current = false;
      return;
    }
    if (stopsLoadedRef.current) return;
    if (['journey', 'navigation', 'trip', 'dashboard'].includes(activeTab)) {
      const timer = setTimeout(() => { void loadStops(); }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [activeTab, hasActiveTrip, isPaired, loadStops]);

  // ── Alighting proximity check (Feature 4) ─────────────────────────────────
  // Runs every 15 seconds while a trip is active. When the driver is within
  // 500m of an unacknowledged stop that has passengers alighting, show a
  // batched banner notification instead of per-passenger spam.
  useEffect(() => {
    if (!hasActiveTrip || !isPaired) {
      const timer = setTimeout(() => {
        setProximityAlert(null);
      }, 0);
      return () => clearTimeout(timer);
    }

    const PROXIMITY_M = 500;

    const check = () => {
      const pos = lastGpsRef.current;
      if (!pos) return;

      const unacked = stops.filter(
        (s) => !s.is_acknowledged && Number.isFinite(Number(s.latitude)) && Number.isFinite(Number(s.longitude))
      );

      for (const stop of unacked) {
        const dist = haversineM(pos.latitude, pos.longitude, Number(stop.latitude), Number(stop.longitude));
        if (dist <= PROXIMITY_M) {
          // Count passengers alighting at this stop (from the occupancy by-stop data if available,
          // otherwise we can't know per-passenger, so just show the stop name).
          setProximityAlert({ stop_name: stop.stop_name ?? stop.name ?? 'next stop', distance_m: Math.round(dist) });
          return;
        }
      }
      setProximityAlert(null);
    };

    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, [hasActiveTrip, isPaired, stops]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (['trip', 'account'].includes(activeTab) && hasActiveTrip && isPaired) {
        void loadPin();
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab, hasActiveTrip, isPaired, loadPin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'earnings' && hasActiveTrip && isPaired) {
        void loadEarnings();
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab, hasActiveTrip, isPaired, loadEarnings]);

  useEffect(() => {
    if (activeTab !== 'earnings' || !hasActiveTrip || !isPaired) return undefined;

    const intervalId = setInterval(() => {
      void loadEarnings();
    }, 15000);

    return () => clearInterval(intervalId);
  }, [activeTab, hasActiveTrip, isPaired, loadEarnings]);

  const handleVerifyPin = async () => {
    if (!trip?.trip_id) {
      setPinStatus('No active trip assigned. PIN verification is unavailable.');
      return;
    }
    try {
      await DriverService.verifyDriverPin(pinInput);
      setPinStatus('PIN verified successfully.');
    } catch (err) {
      setPinStatus(err.message);
    }
  };

  // Immediately flush current GPS to backend — called on stop acknowledge so
  // passengers see the updated bus position right away rather than waiting
  // for the next 10-second scheduled ping.
  const pushLocationNow = useCallback(async () => {
    if (!lastGpsRef.current) return;
    try {
      await DriverService.updateLocation(
        lastGpsRef.current.latitude,
        lastGpsRef.current.longitude,
        lastGpsRef.current.heading ?? null,
        lastGpsRef.current.speed_kmh ?? null,
      );
    } catch {
      // Silent — don't surface network errors on stop acknowledge
    }
  }, []);

  const handleAcknowledgeStop = async (stopId) => {
    if (actionInFlight) {
      return;
    }
    if (!isPaired) {
      setActionMsg(pairingReason);
      return;
    }
    if (!stopId) {
      setActionMsg('Stop identifier is missing. Please refresh route data.');
      return;
    }

    setActionInFlight(true);
    try {
      await DriverService.acknowledgeStop(stopId);
      setStops((prev) => {
        const target = (prev || []).find((stop) => Number(stop?.stop_id) === Number(stopId));
        const targetSeq = Number(target?.sequence_number ?? target?.stop_order ?? Number.POSITIVE_INFINITY);
        return (prev || []).map((stop) => {
          const seq = Number(stop?.sequence_number ?? stop?.stop_order ?? Number.POSITIVE_INFINITY);
          if (Number.isFinite(targetSeq) && Number.isFinite(seq) && seq <= targetSeq) {
            return { ...stop, is_acknowledged: true };
          }
          if (Number(stop?.stop_id) === Number(stopId)) {
            return { ...stop, is_acknowledged: true };
          }
          return stop;
        });
      });
      // Relay current GPS position immediately so passenger map
      // reflects the bus at this stop without waiting for the next ping.
      void pushLocationNow();
      setActionMsg('Stop acknowledged. Location sent to passengers.');
      void loadStops();
    } catch (err) {
      setActionMsg(err.message);
    } finally {
      setActionInFlight(false);
    }
  };

  const handleTripAction = async (action) => {
    const targetTripId = Number(trip?.trip_id ?? shiftState?.openShift?.trip_id ?? 0);
    if (!targetTripId) return;
    if (!isPaired && action === 'depart') {
      setActionMsg(pairingReason);
      return;
    }
    if ((action === 'boarding' || action === 'depart') && !hasOpenShift) {
      setActionMsg('Start your shift first.');
      return;
    }
    if (action === 'complete') {
      setConfirmComplete(true);
      return;
    }
    setActionInFlight(true);
    try {
      if (action === 'boarding') await DriverService.startBoardingTrip(targetTripId);
      if (action === 'depart') await DriverService.departTrip(targetTripId);
      setActionMsg(`Trip ${action} action completed.`);
      await loadData();
    } catch (err) {
      setActionMsg(err.message);
    } finally {
      setActionInFlight(false);
    }
  };

  const handleStartShift = async () => {
    setActionInFlight(true);
    try {
      const res = await DriverService.startDriverShift();
      const shift = res?.data?.shift ?? null;
      setShiftState((prev) => ({
        ...prev,
        openShift: shift,
        latestShift: shift,
      }));
      setActionMsg(res?.message || 'Driver shift started');
      await loadData();
    } catch (err) {
      setActionMsg(err?.message || 'Unable to start shift right now.');
    } finally {
      setActionInFlight(false);
    }
  };

  const handleEndShift = async () => {
    setActionInFlight(true);
    try {
      const res = await DriverService.endDriverShift();
      const shift = res?.data?.shift ?? null;
      setShiftState((prev) => ({
        ...prev,
        openShift: null,
        latestShift: shift,
      }));
      setActionMsg(res?.message || 'Driver shift ended');
      await loadData();
    } catch (err) {
      setActionMsg(err?.message || 'Unable to end shift right now.');
    } finally {
      setActionInFlight(false);
    }
  };

  const handleConfirmedComplete = async () => {
    setConfirmComplete(false);
    setActionInFlight(true);
    try {
      await DriverService.completeTrip(trip.trip_id);
      setActionMsg('Trip completed successfully.');
      void loadData();
    } catch (err) {
      setActionMsg(err.message);
    } finally {
      setActionInFlight(false);
    }
  };

  // S2 (Batch 12): decline the assigned trip — returns it to the
  // unassigned pool for the Operator to reassign. Reason is optional.
  // Works for any status-eligible trip in the driver's assigned list —
  // today or upcoming — and regardless of pairing status (Batch 14).
  const handleConfirmedDecline = async () => {
    const tripId = confirmDecline?.trip_id;
    if (!tripId) return;
    setDeclineSubmitting(true);
    try {
      await DriverService.declineDriverTrip(tripId, declineReasonCode ? { reason_code: declineReasonCode } : {});
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

  // Batch 15, Item 1: explicit Accept counterpart to decline above. No
  // reason/modal needed — a single confirming action records the driver's
  // acknowledgement of the assignment.
  const handleAcceptTrip = async (tripToAccept) => {
    const tripId = tripToAccept?.trip_id;
    if (!tripId) return;
    setActionInFlight(true);
    try {
      await DriverService.acceptDriverTrip(tripId);
      setActionMsg('Trip accepted.');
      void loadData();
    } catch (err) {
      setActionMsg(err.message);
    } finally {
      setActionInFlight(false);
    }
  };

  const handleLogout = onLogout;

  // Batch 15, Item 4: toggle "Available for extra assignment" — independent
  // of shift/pairing state, visible to the Operator on the staff list.
  const handleToggleAvailability = async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    setAvailabilitySaving(true);
    try {
      await DriverService.updateDriverAvailability(next);
    } catch (err) {
      setIsAvailable(!next);
      setActionMsg(err.message);
    } finally {
      setAvailabilitySaving(false);
    }
  };

  // Extracted from an inline JSX onChange handler (architecture audit
  // follow-up) so the render layer never calls DriverService directly.
  const handleToggleTwoFactor = useCallback(async (enabled) => {
    setTwoFactorEnabled(enabled);
    setSaving2fa(true);
    setMsg2fa('');
    try {
      await DriverService.setTwoFactorPreference(enabled, 'driver');
      setMsg2fa(enabled ? '2FA enabled.' : '2FA disabled.');
    } catch (err) {
      setTwoFactorEnabled(!enabled);
      setMsg2fa(err?.message || 'Failed to update.');
    } finally {
      setSaving2fa(false);
    }
  }, []);

  useEffect(() => {
    const pos = lastGps;
    const targetStop = nextStop ?? stops[0];
    if (!pos || !targetStop || !Number.isFinite(Number(targetStop.latitude)) || !Number.isFinite(Number(targetStop.longitude))) {
      return;
    }

    const distanceM = haversineM(
      Number(pos.latitude),
      Number(pos.longitude),
      Number(targetStop.latitude),
      Number(targetStop.longitude)
    );

    let cancelled = false;
    void (async () => {
      const nextStatus = await fetchTrafficStatus({
        currentLat: pos.latitude,
        currentLng: pos.longitude,
        nextStop: targetStop,
        route: currentRoute,
      });
      if (!cancelled) {
        setTrafficStatus({
          ...nextStatus,
          etaMinutes: nextStatus.etaMinutes || Math.max(2, Math.round(distanceM / 280)),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentRoute, lastGps, nextStop, stops]);

  const notifications = [
    {
      title: trip?.status === 'boarding' ? 'Trip Ready for Departure' : 'Trip Status Updated',
      note: currentRoute ? `${currentRoute.origin} to ${currentRoute.destination}` : 'Your assigned route is active.',
      tone: 'danger',
      time: 'Now',
    },
    {
      title: nextStop ? `Next stop: ${nextStop.stop_name ?? nextStop.name ?? 'Pending stop'}` : 'Route on schedule',
      note: nextStop ? `ETA ${trafficStatus.etaMinutes} min • ${trafficStatus.label.toLowerCase()}` : 'All available stops are acknowledged.',
      tone: trafficStatus.level === 'heavy' ? 'warn' : 'info',
      time: 'Updated',
    },
    {
      title: trafficStatus.level === 'heavy' ? 'Traffic alert' : 'Route update available',
      note: trafficStatus.suggestion,
      tone: trafficStatus.level === 'heavy' ? 'warn' : 'info',
      time: 'Today',
    },
    ...((Array.isArray(trafficStatus?.alerts) ? trafficStatus.alerts : []).slice(0, 3).map((alert, idx) => ({
      title: `${String(alert?.road || 'Route segment')} • ${String(alert?.etaMinutes || 0)} min`,
      note: String(alert?.detail || 'Traffic segment update available.'),
      tone: alert?.severity === 'danger' ? 'danger' : alert?.severity === 'warn' ? 'warn' : 'info',
      time: idx === 0 ? 'Live' : 'Updated',
    }))),
  ];

  const journeyStatusLabel =
    trip?.status === 'completed'
      ? 'Journey Completed'
      : trip?.status === 'departed' || trip?.status === 'in-progress'
        ? 'Journey In Progress'
        : 'Ready to Start';

  const pageTitle =
    activeTab === 'dashboard'
      ? 'Dashboard'
      : activeTab === 'assigned'
        ? 'Assigned Routes'
        : activeTab === 'calendar'
          ? 'Calendar'
          : activeTab === 'schedule'
            ? 'Schedule'
            : activeTab === 'journey'
              ? 'Journey'
              : activeTab === 'navigation'
                ? 'Journey / Route Navigation'
                : activeTab === 'earnings'
                  ? 'Trip Earnings'
                  : activeTab === 'alerts'
                    ? 'Traffic Alerts'
                    : activeTab === 'trip'
                      ? 'Trip Status'
                      : 'Account';

  return {
    activeTab, setActiveTab,
    assignedTripFilter,
    profile,
    trip,
    assignedTrips,
    stops,
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
    declineReasonCode, setDeclineReasonCode,
    declineSubmitting,
    twoFactorEnabled,
    saving2fa,
    msg2fa,
    isAvailable,
    availabilitySaving,
    calendarMonth, setCalendarMonth,
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
    calendarDays,
    scheduleUpcoming,
    schedulePast,
    stopProgress,
    tripProgress,
    notifications,
    journeyStatusLabel,
    pageTitle,
    lastGpsRef,
    handleAssignedTripFilterChange,
    loadData,
    loadEarnings,
    handleVerifyPin,
    handleAcknowledgeStop,
    handleTripAction,
    handleStartShift,
    handleEndShift,
    handleConfirmedComplete,
    handleConfirmedDecline,
    handleAcceptTrip,
    handleLogout,
    handleToggleAvailability,
    handleToggleTwoFactor,
  };
}
