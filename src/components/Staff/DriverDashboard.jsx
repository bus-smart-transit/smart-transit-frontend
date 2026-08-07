import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Bus,
  Calendar,
  CheckCircle2,
  Clock3,
  Gauge,
  LogOut,
  Map,
  Navigation,
  RefreshCw,
  Route,
  TrendingUp,
  User,
} from 'lucide-react';
import StaffService from '../../api/StaffService/StaffService';
import PairingScreen from './PairingScreen';
import DriverNavigationMap from './DriverNavigationMap';
import { haversineM } from '../../utils/geo';

const STATUS_COLOR = {
  scheduled: '#64748b',
  boarding: '#3b82f6',
  departed: '#f59e0b',
  'in-progress': '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: Gauge },
  { key: 'assigned', label: 'Assigned Routes', icon: Calendar },
  { key: 'journey', label: 'Journey', icon: Route },
  { key: 'navigation', label: 'Navigation', icon: Navigation },
  { key: 'earnings', label: 'Earnings', icon: TrendingUp },
  { key: 'alerts', label: 'Traffic Alerts', icon: Bell },
  { key: 'trip', label: 'Trip Status', icon: Bus },
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
  const start = toCompactTime(tripLike?.fleet_route?.start_time);
  const end = toCompactTime(tripLike?.fleet_route?.end_time);
  if (start && end) return `${dateLabel} - ${start} to ${end}`;
  if (start) return `${dateLabel} - ${start}`;
  return dateLabel;
};

const isSameDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate()
  );
};

const isCurrentOrSameDayTrip = (tripLike) => {
  if (!tripLike?.trip_id) return false;
  if (!isSameDay(tripLike?.trip_date)) return false;

  const status = String(tripLike?.status || '').toLowerCase();
  return status !== 'completed' && status !== 'cancelled';
};

const getUpcomingTrip = (trips) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (trips || [])
    .filter((item) => {
      const date = new Date(item?.trip_date);
      if (Number.isNaN(date.getTime())) return false;
      const status = String(item?.status || '').toLowerCase();
      return date >= today && status !== 'completed' && status !== 'cancelled';
    })
    .sort((a, b) => new Date(a.trip_date).getTime() - new Date(b.trip_date).getTime())[0] || null;
};

export default function DriverDashboard() {
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
        const res = await StaffService.getPairingStatus('driver');
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
      if (!document.hidden) {
        void refreshPairingStatus();
      }
    }, 12000);

    return () => clearInterval(timer);
  }, [pairing.paired, refreshPairingStatus]);

  const handleLogout = async () => {
    await StaffService.logout('driver').catch(() => {});
    navigate('/employee/login');
  };

  return (
    <DriverDashboardInner
      onLogout={handleLogout}
      pairing={pairing}
      refreshPairingStatus={refreshPairingStatus}
    />
  );
}

function DriverDashboardInner({ onLogout, pairing, refreshPairingStatus }) {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [trip, setTrip] = useState(null);
  const [assignedTrips, setAssignedTrips] = useState([]);
  const [stops, setStops] = useState([]);
  const [pin, setPin] = useState(null);
  const [showTripPin, setShowTripPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinStatus, setPinStatus] = useState('');
  const [earnings, setEarnings] = useState(null);
  const [tripDetailsModal, setTripDetailsModal] = useState(null); // suggestion: trip info modal
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [gpsActive, setGpsActive] = useState(false);
  const isPaired = pairing?.paired === true;
  const pairingReason = pairing?.reason || 'Waiting for pairing with your Conductor before enabling session-synced features.';
  const hasActiveTrip = isCurrentOrSameDayTrip(trip);
  const didBootstrap = useRef(false);
  const stopsLoadedRef = useRef(false);
  const upcomingTrip = getUpcomingTrip(assignedTrips);
  const gpsIntervalRef = useRef(null);
  const gpsWatchRef = useRef(null);
  const lastGpsRef = useRef(null);
  const lastSentGpsRef = useRef(null); // tracks last successfully sent position for deduplication
  const [proximityAlert, setProximityAlert] = useState(null); // { stop_name, count } | null
  const showNoCurrentTripState = !loading && isPaired && !hasActiveTrip && ['dashboard', 'journey', 'navigation', 'trip'].includes(activeTab);

  const currentRoute = trip?.fleet_route?.route;
  const currentFleet = trip?.fleet_route?.fleet;
  const nextStop = stops.find((stop) => !stop.is_acknowledged) ?? null;

  const currentPassengers = Number(trip?.total_occupancy ?? 0);
  const currentCapacity = Number(currentFleet?.capacity ?? 0);
  const tripProgress = currentCapacity > 0
    ? Math.min(100, Math.round((currentPassengers / currentCapacity) * 100))
    : (trip?.status === 'completed' ? 100 : 35);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRes, tripRes, tripsRes] = await Promise.allSettled([
        StaffService.getProfile('driver'),
        StaffService.getCurrentTrip(),
        StaffService.getDriverTrips(),
      ]);
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value?.data);
      if (tripRes.status === 'fulfilled') setTrip(tripRes.value?.data);
      if (tripsRes.status === 'fulfilled') setAssignedTrips(tripsRes.value?.data ?? []);
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStops = useCallback(async () => {
    if (!isPaired || !hasActiveTrip) {
      setStops([]);
      stopsLoadedRef.current = false;
      return;
    }
    try {
      const res = await StaffService.getCurrentTripStops();
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
      const res = await StaffService.getDriverPin();
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
      const res = await StaffService.getTripEarnings('driver');
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
      lastGpsRef.current = {
        latitude,
        longitude,
        heading: Number.isFinite(heading) ? heading : undefined,
        speed_kmh: Number.isFinite(speed) ? Number((speed * 3.6).toFixed(1)) : undefined,
      };
      setGpsActive(true);
    };

    // Watch position continuously so lastGpsRef stays fresh
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      pushLocation,
      () => {}, // silent failure — no permission prompt spam
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    // Push to backend every 10 seconds — only if moved > 30m since last send
    const MIN_DISTANCE_M = 30;
    const sendPing = async () => {
      if (!lastGpsRef.current) return;
      const last = lastSentGpsRef.current;
      if (last) {
        const dLat = lastGpsRef.current.latitude - last.latitude;
        const dLng = lastGpsRef.current.longitude - last.longitude;
        const approxMeters = Math.sqrt(dLat * dLat + dLng * dLng) * 111320;
        if (approxMeters < MIN_DISTANCE_M) return; // haven't moved enough — skip
      }
      try {
        await StaffService.updateLocation(
          lastGpsRef.current.latitude,
          lastGpsRef.current.longitude,
        );
        lastSentGpsRef.current = { latitude: lastGpsRef.current.latitude, longitude: lastGpsRef.current.longitude };
      } catch {
        // Ignore — network hiccups should not surface as errors during a trip
      }
    };

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
      setProximityAlert(null);
      return undefined;
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

  const handleVerifyPin = async () => {
    if (!trip?.trip_id) {
      setPinStatus('No active trip assigned. PIN verification is unavailable.');
      return;
    }
    try {
      await StaffService.verifyDriverPin(pinInput);
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
      await StaffService.updateLocation(
        lastGpsRef.current.latitude,
        lastGpsRef.current.longitude,
      );
    } catch {
      // Silent — don't surface network errors on stop acknowledge
    }
  }, []);

  const handleAcknowledgeStop = async (stopId) => {
    if (!isPaired) {
      setActionMsg(pairingReason);
      return;
    }

    try {
      await StaffService.acknowledgeStop(stopId);
      // Relay current GPS position immediately so passenger map
      // reflects the bus at this stop without waiting for the next ping.
      void pushLocationNow();
      setActionMsg('Stop acknowledged. Location sent to passengers.');
      void loadStops();
    } catch (err) {
      setActionMsg(err.message);
    }
  };

  const handleTripAction = async (action) => {
    if (!trip) return;
    if (!isPaired && action === 'depart') {
      setActionMsg(pairingReason);
      return;
    }

    try {
      if (action === 'depart') await StaffService.departTrip(trip.trip_id);
      if (action === 'complete') await StaffService.completeTrip(trip.trip_id);
      setActionMsg(`Trip ${action} action completed.`);
      void loadData();
    } catch (err) {
      setActionMsg(err.message);
    }
  };

  const handleLogout = onLogout;

  const notifications = [
    {
      title: trip?.status === 'boarding' ? 'Trip Ready for Departure' : 'Trip Status Updated',
      note: currentRoute ? `${currentRoute.origin} to ${currentRoute.destination}` : 'Your assigned route is active.',
      tone: 'danger',
      time: 'Now',
    },
    {
      title: nextStop ? `Next stop: ${nextStop.stop_name ?? nextStop.name ?? 'Pending stop'}` : 'Route on schedule',
      note: nextStop ? 'Proceed when safe and acknowledge upon arrival.' : 'All available stops are acknowledged.',
      tone: 'warn',
      time: 'Updated',
    },
    {
      title: 'Route update available',
      note: 'Keep navigation and alerts in sync before departure.',
      tone: 'info',
      time: 'Today',
    },
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

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-950 text-slate-200 lg:grid-cols-[280px_1fr]">
      <aside className="flex flex-col justify-between border-b border-slate-800 bg-slate-900/70 p-4 lg:border-b-0 lg:border-r">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100">
            <Bus className="h-4 w-4 text-sky-400" />
            Driver Portal
          </div>

          {profile && (
            <div className="mb-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <div className="h-1.5 bg-linear-to-r from-blue-500 via-indigo-500 to-sky-400" />
              <div className="p-3">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 font-semibold text-white">
                    {(profile.name || 'D')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{profile.name}</p>
                    <p className="text-xs text-slate-500">Driver</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <nav className="relative mt-4 flex flex-col gap-1 pl-3">
            <div className="absolute bottom-2 left-1.75 top-2 w-px bg-slate-800" aria-hidden="true" />
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  className="group relative flex items-center gap-3 rounded-lg py-2.5 pl-5 pr-3 text-sm font-medium"
                  onClick={() => {
                    setActiveTab(item.key);
                    setActionMsg('');
                  }}
                >
                  <span
                    className={[
                      'absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border transition',
                      isActive
                        ? 'border-sky-400 bg-sky-400 shadow-[0_0_0_3px_rgba(56,189,248,0.25)]'
                        : 'border-slate-600 bg-slate-950 group-hover:border-slate-400',
                    ].join(' ')}
                    aria-hidden="true"
                  />
                  <Icon className={isActive ? 'h-4 w-4 text-sky-400' : 'h-4 w-4 text-slate-500 group-hover:text-slate-300'} />
                  <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-900 bg-red-950/30 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-950/50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </aside>

      <main className="p-4 sm:p-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-100">{pageTitle}</h1>
            <p className="font-data text-xs text-slate-500">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                pairing.loading
                  ? 'border-slate-700 bg-slate-900 text-slate-400'
                  : isPaired
                    ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300'
                    : 'border-amber-700 bg-amber-950/40 text-amber-300'
              }`}
            >
              {pairing.loading ? 'Checking pairing...' : isPaired ? 'Paired' : 'Not paired'}
            </span>
            {hasActiveTrip && (
              <span
                title={gpsActive ? 'GPS active — location is being sent to passengers' : 'Waiting for GPS fix…'}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  gpsActive
                    ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300'
                    : 'border-slate-700 bg-slate-900 text-slate-500'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${gpsActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}
                />
                {gpsActive ? 'GPS Live' : 'GPS…'}
              </span>
            )}
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500"
              onClick={loadData}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </header>

        {loading && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">Loading driver workspace...</div>}
        {error && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}
        {actionMsg && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
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
          <section className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold text-slate-100">No Current Trip Available</h3>
            <p className="mt-2 text-sm text-slate-400">
              You currently do not have an active or same-day trip to operate.
            </p>
            {upcomingTrip ? (
              <p className="mt-3 text-sm text-sky-300">
                Upcoming trip: {upcomingTrip?.fleet_route?.route?.origin || '-'} to {upcomingTrip?.fleet_route?.route?.destination || '-'} on {formatTripSchedule(upcomingTrip)}.
              </p>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                No upcoming trip is assigned yet. Please check again later.
              </p>
            )}
            <button
              className="mt-4 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500"
              onClick={() => setActiveTab('assigned')}
            >
              View Assigned Trips
            </button>
          </section>
        )}

        {!loading && activeTab === 'dashboard' && !isPaired && (
          <section className="rounded-2xl border border-amber-800 bg-amber-950/20 p-6">
            <h3 className="text-lg font-semibold text-amber-300">Live dashboard features are locked</h3>
            <p className="mt-2 text-sm text-amber-200/90">{pairingReason}</p>
            <p className="mt-2 text-sm text-slate-300">Assigned routes and schedule remain available under Assigned Routes.</p>
          </section>
        )}

        {!loading && activeTab === 'dashboard' && isPaired && !showNoCurrentTripState && (
          <section className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Today's Trip</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-100">{currentRoute?.route_name || `Route ${trip?.fleet_route_id ?? '-'}`}</h3>
              <p className="mt-1 text-sm text-slate-400">{currentRoute?.origin || '-'} to {currentRoute?.destination || '-'}</p>
              <button className="mt-3 text-sm font-semibold text-sky-400 hover:text-sky-300" onClick={() => setActiveTab('assigned')}>View details</button>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Next Stop</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-100">{nextStop?.stop_name ?? nextStop?.name ?? 'No pending stop'}</h3>
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-400"><Clock3 className="h-3.5 w-3.5" /> ETA {formatTripSchedule(trip)}</p>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Trip Progress</p>
              <h3 className="font-data mt-2 text-lg font-semibold text-slate-100">{tripProgress}%</h3>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-linear-to-r from-blue-500 to-sky-400" style={{ width: `${tripProgress}%` }} />
              </div>
              <p className="mt-2 text-sm text-slate-400">{journeyStatusLabel}</p>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Journey Status</p>
              <h3 className="mt-2 text-lg font-semibold capitalize text-slate-100">{trip?.status || 'No active trip'}</h3>
              <p className="mt-1 text-sm text-slate-400">{trip?.status === 'completed' ? 'Journey completed successfully' : 'Use quick actions to control trip flow'}</p>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 md:col-span-2 xl:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-base font-semibold text-slate-100">Quick Actions</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50" onClick={() => handleTripAction('depart')} disabled={!isPaired || trip?.status !== 'boarding'}>
                  Start Trip
                </button>
                <button className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500" onClick={loadData}>
                  Receive Route Updates
                </button>
                <button className="rounded-xl border border-red-900 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-950/50 disabled:opacity-50" onClick={() => handleTripAction('complete')} disabled={!isPaired || !['departed', 'in-progress'].includes(trip?.status)}>
                  End Trip
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 md:col-span-2 xl:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-base font-semibold text-slate-100">Quick Notifications</h4>
              </div>
              <div className="space-y-2">
                {notifications.map((notice, idx) => (
                  <div key={idx} className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2 ${notice.tone === 'danger' ? 'border-red-900 bg-red-950/30' : notice.tone === 'warn' ? 'border-amber-900 bg-amber-950/30' : 'border-sky-900 bg-sky-950/30'}`}>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{notice.title}</p>
                      <p className="text-xs text-slate-400">{notice.note}</p>
                    </div>
                    <small className="font-data text-xs text-slate-500">{notice.time}</small>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {!loading && activeTab === 'assigned' && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-100">Today's Assigned Routes</h4>
              <span className="font-data text-xs text-slate-500">{assignedTrips.length} trip(s)</span>
            </div>
            {assignedTrips.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">No assigned trips for today.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-175 text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase tracking-[0.16em] text-slate-500">
                      <th className="py-3">Route ID</th>
                      <th className="py-3">Route</th>
                      <th className="py-3">Departure</th>
                      <th className="py-3">Destination</th>
                      <th className="py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedTrips.map((item) => (
                      <tr
                        key={item.trip_id}
                        className="border-b border-slate-800/70 cursor-pointer hover:bg-slate-900/60 transition-colors"
                        onClick={() => setTripDetailsModal(item)}
                        title="Click for trip details"
                      >
                        <td className="py-3 font-data text-slate-400">RTE-{item.trip_id}</td>
                        <td className="py-3 text-slate-200">{item.fleet_route?.route?.origin || '-'} to {item.fleet_route?.route?.destination || '-'}</td>
                        <td className="py-3 font-data text-slate-300">{formatTripSchedule(item)}</td>
                        <td className="py-3 text-slate-300">{item.fleet_route?.route?.destination || '-'}</td>
                        <td className="py-3"><span className="rounded-full border border-slate-700 px-2 py-1 text-xs capitalize" style={{ color: STATUS_COLOR[item.status] || '#64748b' }}>{item.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {!loading && activeTab === 'journey' && !isPaired && (
          <section className="rounded-2xl border border-amber-800 bg-amber-950/20 p-6">
            <h3 className="text-lg font-semibold text-amber-300">Journey tracking is locked</h3>
            <p className="mt-2 text-sm text-amber-200/90">{pairingReason}</p>
          </section>
        )}

        {!loading && activeTab === 'journey' && isPaired && !showNoCurrentTripState && (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <h4 className="mb-3 text-base font-semibold text-slate-100">Journey Stops</h4>
              {stops.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">No stop data available.</div>
              ) : (
                <div className="space-y-2">
                  {stops.map((stop, idx) => (
                    <div key={stop.stop_id ?? idx} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${stop.is_acknowledged ? 'border-emerald-900 bg-emerald-950/20' : 'border-slate-800 bg-slate-950'}`}>
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{stop.stop_name ?? stop.name ?? `Stop ${idx + 1}`}</p>
                        <p className="text-xs text-slate-500">{stop.distance_from_origin_km != null ? `${stop.distance_from_origin_km} km from origin` : 'Distance unavailable'}</p>
                      </div>
                      {stop.is_acknowledged ? (
                        <span className="text-xs font-semibold text-emerald-300">Reached</span>
                      ) : (
                        <button className="rounded-lg bg-sky-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-sky-400" onClick={() => handleAcknowledgeStop(stop.route_stop_id ?? stop.stop_id)}>
                          Acknowledge
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <h4 className="mb-3 text-base font-semibold text-slate-100">Live Summary</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-slate-500">Total Distance</span><strong className="font-data text-slate-100">{stops[stops.length - 1]?.distance_from_origin_km ?? 0} km</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Travel Time</span><strong className="font-data text-slate-100">{trip?.trip_date ? '1h 10m' : '-'}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Average Speed</span><strong className="font-data text-slate-100">38 km/h</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Total Stops</span><strong className="font-data text-slate-100">{stops.length}</strong></div>
              </div>
            </article>
          </section>
        )}

        {!loading && activeTab === 'navigation' && !isPaired && (
          <section className="rounded-2xl border border-amber-800 bg-amber-950/20 p-6">
            <h3 className="text-lg font-semibold text-amber-300">Route navigation is locked</h3>
            <p className="mt-2 text-sm text-amber-200/90">{pairingReason}</p>
          </section>
        )}

        {!loading && activeTab === 'navigation' && isPaired && !showNoCurrentTripState && (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6 lg:col-span-2">
              <h4 className="mb-3 text-base font-semibold text-slate-100">Route Navigation</h4>
              <DriverNavigationMap trip={trip} stops={stops} lastGpsRef={lastGpsRef} />
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <h4 className="mb-3 text-base font-semibold text-slate-100">Route Details</h4>
              {stops.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">No route details available.</div>
              ) : (
                <div className="space-y-2">
                  {stops.map((stop, idx) => (
                    <div key={stop.stop_id ?? idx} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 text-xs font-semibold text-slate-300">{idx + 1}</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{stop.stop_name ?? stop.name ?? `Stop ${idx + 1}`}</p>
                        <small className="font-data text-xs text-slate-500">{stop.distance_from_origin_km != null ? `${stop.distance_from_origin_km} km` : ''}</small>
                      </div>
                      {stop.is_acknowledged && <span className="ml-auto text-xs text-emerald-400">✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        )}

        {!loading && activeTab === 'earnings' && !isPaired && (
          <section className="rounded-2xl border border-amber-800 bg-amber-950/20 p-6">
            <h3 className="text-lg font-semibold text-amber-300">Earnings locked</h3>
            <p className="mt-2 text-sm text-amber-200/90">{pairingReason}</p>
          </section>
        )}

        {!loading && activeTab === 'earnings' && isPaired && !showNoCurrentTripState && (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Total Fare Collected</p>
              <h3 className="font-data mt-2 text-2xl font-bold text-slate-100">
                PHP {earnings ? Number(earnings.total_fare).toFixed(2) : '—'}
              </h3>
              <p className="mt-1 text-sm text-slate-400">{earnings?.passenger_count ?? 0} passengers</p>
            </article>
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Onsite (Cash)</p>
              <h3 className="font-data mt-2 text-2xl font-bold text-emerald-300">
                PHP {earnings ? Number(earnings.onsite_amount).toFixed(2) : '—'}
              </h3>
            </article>
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Online (PayMongo)</p>
              <h3 className="font-data mt-2 text-2xl font-bold text-sky-300">
                PHP {earnings ? Number(earnings.online_amount).toFixed(2) : '—'}
              </h3>
            </article>
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 md:col-span-2 xl:col-span-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Average Fare</p>
                  <p className="font-data mt-1 text-lg font-semibold text-slate-100">
                    PHP {earnings ? Number(earnings.average_fare).toFixed(2) : '—'} per passenger
                  </p>
                </div>
                <button
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500"
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

        {!loading && activeTab === 'alerts' && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-100">Traffic Alerts</h4>
              <button className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500">Mark all as read</button>
            </div>
            <div className="space-y-2">
              {notifications.map((notice, idx) => (
                <div key={idx} className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2 ${notice.tone === 'danger' ? 'border-red-900 bg-red-950/30' : notice.tone === 'warn' ? 'border-amber-900 bg-amber-950/30' : 'border-sky-900 bg-sky-950/30'}`}>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{notice.title}</p>
                    <p className="text-xs text-slate-400">{notice.note}</p>
                  </div>
                  <small className="font-data text-xs text-slate-500">{notice.time}</small>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && activeTab === 'trip' && !isPaired && (
          <section className="space-y-4">
            <PairingScreen
              role="driver"
              paired={isPaired}
              pairingReason={pairingReason}
              onPaired={() => void refreshPairingStatus()}
            />
            <article className="rounded-2xl border border-amber-800 bg-amber-950/20 p-4">
              <p className="text-sm text-amber-200/90">Start Trip and all active-trip tools stay locked until pairing is complete.</p>
            </article>
          </section>
        )}

        {!loading && activeTab === 'trip' && isPaired && !showNoCurrentTripState && (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-base font-semibold text-slate-100">Current Trip Summary</h4>
                <span className="rounded-full border border-slate-700 px-2 py-1 text-xs capitalize" style={{ color: STATUS_COLOR[trip?.status] || '#64748b' }}>{trip?.status || 'idle'}</span>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-slate-500">Total Distance</span><strong className="font-data text-slate-100">{stops[stops.length - 1]?.distance_from_origin_km ?? 0} km</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Travel Time</span><strong className="font-data text-slate-100">1h 10m</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Average Speed</span><strong className="font-data text-slate-100">38 km/h</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Trip Progress</span><strong className="font-data text-slate-100">{tripProgress}%</strong></div>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-linear-to-r from-blue-500 to-sky-400" style={{ width: `${tripProgress}%` }} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50" onClick={() => handleTripAction('depart')} disabled={!isPaired || trip?.status !== 'boarding'}>Start Trip</button>
                <button className="rounded-xl border border-red-900 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-950/50 disabled:opacity-50" onClick={() => handleTripAction('complete')} disabled={!isPaired || !['departed', 'in-progress'].includes(trip?.status)}>End Trip</button>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <h4 className="mb-3 text-base font-semibold text-slate-100">Daily PIN Verification</h4>
              {pin && (
                <>
                  <div className="font-data mb-2 rounded-xl border border-dashed border-slate-700 bg-slate-950 p-3 text-center text-2xl font-bold tracking-[0.2em] text-slate-100">
                    {showTripPin ? pin.pin_code : '••••••'}
                  </div>
                  <div className="mb-3 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowTripPin((prev) => !prev)}
                      className="rounded-xl border border-slate-700 bg-white p-1 transition hover:scale-[1.01]"
                      title="Tap QR to show or hide PIN"
                    >
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(pin.pin_code)}`}
                        alt="PIN QR code"
                        className="h-36 w-36"
                      />
                    </button>
                  </div>
                  <p className="mb-3 text-center text-xs text-slate-500">Tap QR to {showTripPin ? 'hide' : 'show'} PIN code</p>
                  <div className="mb-3 space-y-2 text-xs">
                    {pin.fleet_plate_number && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Fleet</span>
                        <strong className="rounded-full border border-sky-800 bg-sky-950/40 px-2 py-0.5 text-sky-300">{pin.fleet_plate_number}</strong>
                      </div>
                    )}
                    {pin.route_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Route</span>
                        <strong className="text-slate-300">{pin.route_name}</strong>
                      </div>
                    )}
                    <div className="flex items-center justify-between"><span className="text-slate-500">Driver Verified</span><strong className={pin.driver_verified_at ? 'text-emerald-400' : 'text-slate-500'}>{pin.driver_verified_at ? '✓ Yes' : 'Not yet'}</strong></div>
                    <div className="flex items-center justify-between"><span className="text-slate-500">Conductor Verified</span><strong className={pin.conductor_verified_at ? 'text-emerald-400' : 'text-slate-500'}>{pin.conductor_verified_at ? '✓ Yes' : 'Not yet'}</strong></div>
                  </div>
                  {pin.both_verified && (
                    <div className="mb-3 rounded-xl border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-center text-xs font-semibold text-emerald-300">
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
                  className="font-data h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400"
                />
                <button className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400" onClick={handleVerifyPin}>Verify</button>
              </div>
              {pinStatus && <p className={`mt-3 text-sm ${pinStatus === 'PIN verified successfully.' ? 'text-emerald-400' : 'text-red-400'}`}>{pinStatus}</p>}
            </article>
          </section>
        )}

        {!loading && activeTab === 'account' && (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <h4 className="mb-3 text-base font-semibold text-slate-100">Profile Information</h4>
              <div className="mb-4 flex flex-col items-center rounded-xl border border-slate-800 bg-slate-950 p-4 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-2xl font-bold text-white">
                  {(profile?.name || 'D')[0].toUpperCase()}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-100">{profile?.name || 'Driver'}</h3>
                <p className="text-xs text-slate-500">Verified Driver</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-slate-500">Email</span><strong className="text-slate-100">{profile?.user?.email || profile?.email || '-'}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Driver ID</span><strong className="font-data text-slate-100">{profile?.company_user_id || '-'}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Status</span><strong className="text-emerald-300">Active</strong></div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
              <h4 className="mb-3 text-base font-semibold text-slate-100">PIN and Trip Context</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-slate-500">Trip ID</span><strong className="font-data text-slate-100">{pin?.trip_id ?? trip?.trip_id ?? '-'}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Route</span><strong className="text-slate-100">{pin?.route_name || currentRoute?.route_name || '-'}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Fleet</span><strong className="font-data text-slate-100">{pin?.fleet_plate_number || currentFleet?.plate_number || '-'}</strong></div>
                <div className="flex items-center justify-between"><span className="text-slate-500">Date</span><strong className="font-data text-slate-100">{formatDateTime(pin?.pin_date || trip?.trip_date)}</strong></div>
              </div>
            </article>
          </section>
        )}
      </main>

      {/* ── Suggestion: Trip details modal ───────────────────────────────── */}
      {tripDetailsModal && (() => {
        const td = tripDetailsModal;
        const route = td.fleet_route?.route || {};
        const fleet = td.fleet_route?.fleet || {};
        return (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
            role="presentation"
            onClick={() => setTripDetailsModal(null)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-label="Trip details"
              onClick={(e) => e.stopPropagation()}
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
          </div>
        );
      })()}
    </div>
  );
}
