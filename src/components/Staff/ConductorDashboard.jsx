import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  Bus,
  Camera,
  Calendar,
  CheckCircle2,
  KeyRound,
  LogOut,
  QrCode,
  RefreshCw,
  Ticket,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import QrScanner from 'qr-scanner';
import StaffService from '../../api/StaffService/StaffService';
import usePassengersByTrip from '../../api/hooks/Staff/usePassengersByTrip';
import useOnsiteReceiptPrinter from '../../api/hooks/Staff/useOnsiteReceiptPrinter';
import PairingScreen from './PairingScreen';

const NAV_ITEMS = [
  { key: 'trip', label: 'Current Trip', icon: Bus },
  { key: 'assigned', label: 'Assigned Trips', icon: Calendar },
  { key: 'occupancy', label: 'Occupancy', icon: BarChart3 },
  { key: 'scan', label: 'Scan Ticket', icon: QrCode },
  { key: 'passengers', label: 'Passengers', icon: Users },
  { key: 'pin', label: 'Daily PIN', icon: KeyRound },
];

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} - ${hh}:${min}`;
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

export default function ConductorDashboard() {
  const navigate = useNavigate();

  // ── Pairing gate (backend-verified on every mount) ──────────────────
  const [paired, setPaired] = useState(null);

  useEffect(() => {
    StaffService.getPairingStatus('conductor')
      .then((res) => setPaired(res?.data?.paired === true))
      .catch(() => setPaired(false));
  }, []);

  const handleLogout = async () => {
    await StaffService.logout('conductor').catch(() => {});
    navigate('/employee/login');
  };

  if (paired === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-sky-400" />
      </div>
    );
  }

  if (!paired) {
    return (
      <PairingScreen
        role="conductor"
        onPaired={() => setPaired(true)}
        onLogout={handleLogout}
      />
    );
  }

  return <ConductorDashboardInner onLogout={handleLogout} />;
}

function ConductorDashboardInner({ onLogout }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('trip');
  const [profile, setProfile] = useState(null);
  const [trip, setTrip] = useState(null);
  const [assignedTrips, setAssignedTrips] = useState([]);
  const [occupancy, setOccupancy] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [pin, setPin] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinStatus, setPinStatus] = useState('');
  const [scanUuid, setScanUuid] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [groupScanResult, setGroupScanResult] = useState(null);
  const [scannerRunning, setScannerRunning] = useState(false);
  const [scannerBusy, setScannerBusy] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [scannerStatus, setScannerStatus] = useState('');
  const [onsiteReceipt, setOnsiteReceipt] = useState(null);
  const [onsiteForm, setOnsiteForm] = useState({
    origin_stop_id: '',
    destination_stop_id: '',
    seat_type: 'seated',
    passenger_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const hasActiveTrip = isCurrentOrSameDayTrip(trip);
  const didBootstrap = useRef(false);
  const videoRef = useRef(null);
  const scannerStreamRef = useRef(null);
  const scannerTimerRef = useRef(null);
  const scannerBusyRef = useRef(false);
  const lastDetectedRef = useRef({ value: '', at: 0 });
  const upcomingTrip = getUpcomingTrip(assignedTrips);
  const showNoCurrentTripState = !loading && !hasActiveTrip && ['trip', 'occupancy', 'passengers', 'pin'].includes(activeTab);
  const routeStops = trip?.fleet_route?.route?.route_stops || trip?.fleet_route?.route?.routeStops || [];
  const groupedPassengers = usePassengersByTrip(passengers, trip);
  const { printOnsiteReceipt } = useOnsiteReceiptPrinter();

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
    try {
      const [profileRes, tripRes, tripsRes] = await Promise.allSettled([
        StaffService.getProfile('conductor'),
        StaffService.getConductorTrip(),
        StaffService.getConductorTrips(),
      ]);
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value?.data);
      if (tripRes.status === 'fulfilled') setTrip(tripRes.value?.data);
      if (tripsRes.status === 'fulfilled') setAssignedTrips(tripsRes.value?.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOccupancy = useCallback(async () => {
    if (!trip?.trip_id) {
      setOccupancy(null);
      return;
    }
    try {
      const res = await StaffService.getTripOccupancy();
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
      const res = await StaffService.getCurrentPassengers();
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
      setPin(null);
      return;
    }
    try {
      const res = await StaffService.getConductorPin();
      setPin(res?.data);
    } catch (err) {
      setError(err.message);
    }
  }, [trip?.trip_id]);

  useEffect(() => {
    if (didBootstrap.current) return;
    didBootstrap.current = true;
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'occupancy' && hasActiveTrip) void loadOccupancy();
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab, hasActiveTrip, loadOccupancy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'passengers' && hasActiveTrip) void loadPassengers();
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab, hasActiveTrip, loadPassengers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'pin' && hasActiveTrip) void loadPin();
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab, hasActiveTrip, loadPin]);

  useEffect(() => {
    if (activeTab !== 'scan') {
      stopScanner();
    }
  }, [activeTab, stopScanner]);

  useEffect(() => () => stopScanner(), [stopScanner]);

  const handleScan = useCallback(async (scannedUuid = scanUuid) => {
    const ticketUuid = String(scannedUuid || '').trim();

    if (!trip?.trip_id) {
      setScanResult({ success: false, msg: 'No active trip assigned. Ticket scanning is unavailable.' });
      return;
    }

    if (!ticketUuid) {
      setScanResult({ success: false, msg: 'Please provide a ticket UUID before scanning.' });
      return;
    }

    setGroupScanResult(null);
    setScanResult(null);
    try {
      const res = await StaffService.scanTicket(ticketUuid);
      setScanResult({ success: true, data: res?.data, msg: res?.message });
      setActionMsg('Ticket scanned successfully.');
      setScanUuid(ticketUuid);
      void loadOccupancy();
    } catch (err) {
      setScanResult({ success: false, msg: err.message });
    }
  }, [loadOccupancy, scanUuid, trip?.trip_id]);

  const handleGroupScan = useCallback(async (transactionRef) => {
    if (!trip?.trip_id) {
      setGroupScanResult({ success: false, msg: 'No active trip assigned. Group scanning is unavailable.' });
      return;
    }

    setScanResult(null);
    setGroupScanResult(null);
    try {
      const res = await StaffService.scanGroupTickets(transactionRef);
      setGroupScanResult({ success: true, data: res?.data, msg: res?.message });
      setActionMsg(`${res?.data?.boarded_count ?? 0} ticket(s) boarded.`);
      void loadOccupancy();
    } catch (err) {
      setGroupScanResult({ success: false, msg: err.message });
    }
  }, [loadOccupancy, trip?.trip_id]);

  const startScanner = useCallback(async () => {
    setScannerError('');
    setScannerStatus('');
    setScanResult(null);

    if (!trip?.trip_id) {
      setScannerError('No active trip assigned. Camera scanning is unavailable.');
      return;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      setScannerError('Camera API is not available on this device/browser.');
      return;
    }

    if (!videoRef.current) {
      setScannerError('Scanner element is not ready. Please try again.');
      return;
    }

    try {
      // Initialize QR Scanner with cross-browser support
      const qrScanner = new QrScanner(
        videoRef.current,
        async (result) => {
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
            return;
          }

          lastDetectedRef.current = { value: rawValue, at: now };
          setScannerStatus('⏳ Processing scan…');

          // Group QR path — encodes "grp:{transaction_reference}"
          if (typeof rawValue === 'string' && rawValue.startsWith('grp:')) {
            const transactionRef = rawValue.slice(4).trim();
            setScannerStatus('Group QR detected. Boarding all tickets in this order...');
            try {
              await handleGroupScan(transactionRef);
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
            await handleScan(parsedUuid);
          } finally {
            scannerBusyRef.current = false;
            setScannerBusy(false);
          }
        },
        {
          onDecodeError: () => {
            setScannerStatus('Scanning... keep QR centered and well-lit.');
          },
          maxScansPerSecond: 2,
          preferredCamera: 'environment',
          workerPath: '/qr-scanner-worker.min.js',
        }
      );

      scannerStreamRef.current = qrScanner;
      await qrScanner.start();

      // Guard: scanner may have been stopped while start() was awaiting (e.g. tab change)
      if (!scannerStreamRef.current) return;

      setScannerRunning(true);
      setScannerStatus('Camera is active. Point it at a ticket QR code.');
    } catch (err) {
      stopScanner();
      setScannerError(err?.message || 'Unable to access camera for QR scanning.');
    }
  }, [extractTicketUuid, handleGroupScan, handleScan, stopScanner, trip?.trip_id]);

  const handleAlight = async (ticketId) => {
    try {
      await StaffService.recordAlighting(ticketId);
      setActionMsg('Alighting recorded.');
      void loadPassengers();
    } catch (err) {
      setActionMsg(err.message);
    }
  };

  const handleVerifyPin = async () => {
    if (!trip?.trip_id) {
      setPinStatus('No active trip assigned. PIN verification is unavailable.');
      return;
    }
    try {
      await StaffService.verifyConductorPin(pinInput);
      setPinStatus('PIN verified successfully.');
    } catch (err) {
      setPinStatus(err.message);
    }
  };

  const handleOnsiteCheckout = async () => {
    if (!trip?.trip_id) {
      setActionMsg('No active trip assigned. Onsite checkout is unavailable.');
      return;
    }

    if (!onsiteForm.origin_stop_id || !onsiteForm.destination_stop_id) {
      setActionMsg('Please select origin and destination stops for onsite checkout.');
      return;
    }

    try {
      const res = await StaffService.checkoutOnsite({
        items: [
          {
            trip_id: Number(trip.trip_id),
            seat_type: onsiteForm.seat_type,
            origin_stop_id: Number(onsiteForm.origin_stop_id),
            destination_stop_id: Number(onsiteForm.destination_stop_id),
            passenger_id: onsiteForm.passenger_id ? Number(onsiteForm.passenger_id) : null,
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
        passenger_id: '',
      });
      void loadPassengers();
      void loadOccupancy();
    } catch (err) {
      setOnsiteReceipt(null);
      setActionMsg(err.message || 'Failed to record onsite checkout.');
    }
  };

  const handleLogout = onLogout;

  const capPct = occupancy
    ? Math.min(
        100,
        Math.round(
          ((Number(occupancy?.boarded?.seated ?? occupancy?.current_seated ?? 0) +
            Number(occupancy?.boarded?.standing ?? occupancy?.current_standing ?? 0)) /
            (Number(occupancy?.capacity?.total ?? occupancy?.total_capacity ?? 1) || 1)) *
            100,
        ),
      )
    : 0;

  const occSeated = Number(occupancy?.boarded?.seated ?? occupancy?.current_seated ?? 0);
  const occStanding = Number(occupancy?.boarded?.standing ?? occupancy?.current_standing ?? 0);
  const occSeatedCap = Number(occupancy?.capacity?.seated ?? occupancy?.seated_capacity ?? 0);
  const occStandingCap = Number(occupancy?.capacity?.standing ?? occupancy?.standing_capacity ?? 0);
  const occTotalCap = Number(occupancy?.capacity?.total ?? occupancy?.total_capacity ?? 0);

  const pageTitle =
    activeTab === 'trip'
      ? 'Current Trip'
      : activeTab === 'assigned'
        ? 'Assigned Trips'
        : activeTab === 'occupancy'
          ? 'Trip Occupancy'
          : activeTab === 'scan'
            ? 'Scan Ticket'
            : activeTab === 'passengers'
              ? 'Current Passengers'
              : 'Daily PIN Verification';

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-950 text-slate-200 lg:grid-cols-[280px_1fr]">
      <aside className="flex flex-col justify-between border-b border-slate-800 bg-slate-900/70 p-4 lg:border-b-0 lg:border-r">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100">
            <Ticket className="h-4 w-4 text-sky-400" />
            Conductor Portal
          </div>

          {profile && (
            <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-3">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 font-semibold text-white">
                  {(profile.name || 'C')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">{profile.name}</p>
                  <p className="text-xs text-slate-500">Conductor</p>
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
                    setScanResult(null);
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
          <h1 className="text-xl font-bold text-slate-100">{pageTitle}</h1>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500"
              onClick={loadData}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            {actionMsg && <span className="rounded-xl border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-300">{actionMsg}</span>}
          </div>
        </header>

        {loading && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">Loading dashboard data...</div>}
        {error && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {showNoCurrentTripState && (
          <section className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold text-slate-100">No Current Trip Available</h3>
            <p className="mt-2 text-sm text-slate-400">
              You currently do not have an active or same-day trip assignment.
            </p>
            {upcomingTrip ? (
              <p className="mt-3 text-sm text-sky-300">
                Upcoming trip: {upcomingTrip?.fleet_route?.route?.origin || '-'} to {upcomingTrip?.fleet_route?.route?.destination || '-'} on {formatDateTime(upcomingTrip?.trip_date)}.
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

        {!loading && activeTab === 'trip' && !showNoCurrentTripState && (
          <section className="grid gap-4 md:grid-cols-2">
            {!trip ? (
              <article className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 p-6">
                <h3 className="text-lg font-semibold text-slate-100">No Active Trip</h3>
                <p className="mt-2 text-sm text-slate-500">No trip currently assigned.</p>
              </article>
            ) : (
              <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-100">Trip #{trip.trip_id}</h3>
                  <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs text-sky-300">{trip.status}</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-slate-500">Date</span><strong className="font-data text-slate-100">{formatDateTime(trip.trip_date)}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Seated Passengers</span><strong className="font-data text-slate-100">{trip.current_seated_capacity ?? 0}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Standing Passengers</span><strong className="font-data text-slate-100">{trip.current_standing_capacity ?? 0}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Total Occupancy</span><strong className="font-data text-slate-100">{trip.total_occupancy ?? 0}</strong></div>
                </div>
              </article>
            )}
          </section>
        )}

        {!loading && activeTab === 'assigned' && (
          <section className="grid gap-4 md:grid-cols-2">
            {assignedTrips.length === 0 ? (
              <article className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 p-6">
                <h3 className="text-lg font-semibold text-slate-100">No Assigned Trips</h3>
                <p className="mt-2 text-sm text-slate-500">You do not have any upcoming assigned trips.</p>
              </article>
            ) : (
              assignedTrips.map((item) => (
                <article key={item.trip_id} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-100">Trip #{item.trip_id}</h3>
                    <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs text-sky-300">{item.status}</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between"><span className="text-slate-500">Date</span><strong className="font-data text-slate-100">{formatDateTime(item.trip_date)}</strong></div>
                    <div className="flex items-center justify-between"><span className="text-slate-500">Fleet</span><strong className="text-slate-100">{item.fleet_route?.fleet?.plate_number || `Fleet ${item.fleet_route?.fleet_id || '-'}`}</strong></div>
                    <div className="flex items-center justify-between"><span className="text-slate-500">Route</span><strong className="text-slate-100">{item.fleet_route?.route?.route_name || `Route ${item.fleet_route?.route_id || '-'}`}</strong></div>
                  </div>
                </article>
              ))
            )}
          </section>
        )}

        {!loading && activeTab === 'occupancy' && !showNoCurrentTripState && (
          <section className="max-w-2xl">
            {!occupancy ? (
              <article className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 p-6">
                <h3 className="text-lg font-semibold text-slate-100">No Occupancy Data</h3>
              </article>
            ) : (
              <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-100">Live Occupancy</h3>
                  <span className="font-data rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300">{capPct}% Full</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${capPct}%`, backgroundColor: capPct > 90 ? '#ef4444' : capPct > 70 ? '#f59e0b' : '#22c55e' }}
                  />
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-slate-500">Seated</span><strong className="font-data text-slate-100">{occSeated} / {occSeatedCap}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Standing</span><strong className="font-data text-slate-100">{occStanding} / {occStandingCap}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Total Capacity</span><strong className="font-data text-slate-100">{occTotalCap}</strong></div>
                </div>
                <button
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-500"
                  onClick={loadOccupancy}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </article>
            )}
          </section>
        )}

        {!loading && activeTab === 'scan' && (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-lg font-semibold text-slate-100">Scan QR Ticket</h3>
              <p className="mt-2 text-sm text-slate-500">Use smartphone camera scanning, or enter ticket UUID manually.</p>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {!scannerRunning ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-700 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                      onClick={() => void startScanner()}
                    >
                      <Camera className="h-4 w-4" />
                      Start Camera Scanner
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-700 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
                      onClick={stopScanner}
                    >
                      <Camera className="h-4 w-4" />
                      Stop Camera
                    </button>
                  )}

                  <span className="text-xs text-slate-400">
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
                      <p className="text-xs font-semibold text-sky-300">Validating…</p>
                    </div>
                  )}
                </div>

                {scannerStatus && <p className="mt-2 text-xs text-slate-400">{scannerStatus}</p>}
                {scannerError && <p className="mt-2 text-xs text-red-300">{scannerError}</p>}
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
                  className="font-data h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400"
                />
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handleScan}
                  disabled={scannerBusy}
                >
                  {scannerBusy
                    ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />Validating…</>
                    : <><QrCode className="h-4 w-4" />Scan</>}
                </button>
              </div>

              {/* Single-ticket result */}
              {scanResult && (
                <div
                  className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                    scanResult.success
                      ? 'border-emerald-900 bg-emerald-950/40 text-emerald-300'
                      : 'border-red-900 bg-red-950/40 text-red-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {scanResult.success ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <XCircle className="mt-0.5 h-4 w-4" />}
                    <div>
                      <p className="font-semibold">{scanResult.msg}</p>
                      {scanResult.success && scanResult.data && (
                        <div className="mt-2 space-y-1 text-xs text-slate-300">
                          <div>Destination: {scanResult.data.destination || 'N/A'}</div>
                          <div>Seat Type: {scanResult.data.seat_type}</div>
                          <div className="font-data">Amount: PHP {scanResult.data.amount}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Group-ticket result */}
              {groupScanResult && (
                <div
                  className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                    groupScanResult.success
                      ? 'border-emerald-900 bg-emerald-950/40 text-emerald-300'
                      : 'border-red-900 bg-red-950/40 text-red-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {groupScanResult.success ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <XCircle className="mt-0.5 h-4 w-4" />}
                    <div className="w-full">
                      <p className="font-semibold">{groupScanResult.msg}</p>
                      {groupScanResult.success && groupScanResult.data?.tickets?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {groupScanResult.data.tickets.map((t, i) => (
                            <div
                              key={t.ticket_uuid || i}
                              className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${
                                t.skipped
                                  ? 'bg-slate-800/50 text-slate-400'
                                  : 'bg-emerald-900/30 text-emerald-300'
                              }`}
                            >
                              <span>{t.passenger_name} → {t.destination || 'N/A'} ({t.seat_type})</span>
                              <span className="font-semibold">
                                {t.skipped ? t.skip_reason : 'Boarded'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-lg font-semibold text-slate-100">Onsite Checkout (Cash)</h3>
              <p className="mt-2 text-sm text-slate-500">Record an onboard payment for passengers who pay in cash.</p>

              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={onsiteForm.origin_stop_id}
                    onChange={(e) => setOnsiteForm((prev) => ({ ...prev, origin_stop_id: e.target.value }))}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
                  >
                    <option value="">Select origin stop</option>
                    {routeStops.map((stop) => (
                      <option key={`onsite-origin-${stop.stop_id}`} value={stop.stop_id}>
                        {stop?.stop?.stop_name || stop?.stop_name || `Stop ${stop.stop_id}`}
                      </option>
                    ))}
                  </select>
                  <select
                    value={onsiteForm.destination_stop_id}
                    onChange={(e) => setOnsiteForm((prev) => ({ ...prev, destination_stop_id: e.target.value }))}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
                  >
                    <option value="">Select destination stop</option>
                    {routeStops.map((stop) => (
                      <option key={`onsite-destination-${stop.stop_id}`} value={stop.stop_id}>
                        {stop?.stop?.stop_name || stop?.stop_name || `Stop ${stop.stop_id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={onsiteForm.seat_type}
                    onChange={(e) => setOnsiteForm((prev) => ({ ...prev, seat_type: e.target.value }))}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
                  >
                    <option value="seated">Seated</option>
                    <option value="standing">Standing</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    placeholder="Passenger ID (optional)"
                    value={onsiteForm.passenger_id}
                    onChange={(e) => setOnsiteForm((prev) => ({ ...prev, passenger_id: e.target.value }))}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400"
                  />
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                  onClick={handleOnsiteCheckout}
                  disabled={!hasActiveTrip}
                >
                  Record Cash Checkout
                </button>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => {
                    const didPrint = printOnsiteReceipt({ receipt: onsiteReceipt, routeStops });
                    if (!didPrint) {
                      setActionMsg('No onsite checkout receipt available to print yet.');
                    }
                  }}
                  disabled={!onsiteReceipt || !onsiteReceipt?.tickets?.length}
                >
                  Print Last Onsite Ticket
                </button>

                {onsiteReceipt?.payment?.transaction_reference && (
                  <p className="text-xs text-slate-400">
                    Last receipt: {onsiteReceipt.payment.transaction_reference} ({onsiteReceipt.tickets?.length || 0} ticket/s)
                  </p>
                )}
              </div>
            </article>
          </section>
        )}

        {!loading && activeTab === 'passengers' && !showNoCurrentTripState && (
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

        {!loading && activeTab === 'pin' && !showNoCurrentTripState && (
          <section className="grid max-w-3xl gap-4 md:grid-cols-2">
            {pin && (
              <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <h3 className="text-lg font-semibold text-slate-100">Today's PIN Code</h3>
                <div className="font-data mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950 p-4 text-center text-2xl font-bold tracking-[0.2em] text-slate-100">
                  {pin.pin_code}
                </div>
                {pin.pin_code && (
                  <div className="mt-3 flex justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pin.pin_code)}`}
                      alt="PIN QR code"
                      className="h-40 w-40 rounded-xl border border-slate-700 bg-white p-1"
                    />
                  </div>
                )}
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-slate-500">Trip</span><strong className="font-data text-slate-100">#{pin.trip_id ?? '-'}</strong></div>
                  {pin.route_name && <div className="flex items-center justify-between"><span className="text-slate-500">Route</span><strong className="text-slate-100">{pin.route_name}</strong></div>}
                  {pin.fleet_plate_number && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Fleet</span>
                      <strong className="rounded-full border border-sky-800 bg-sky-950/40 px-2 py-0.5 text-sky-300">{pin.fleet_plate_number}</strong>
                    </div>
                  )}
                  {pin.trip_status && <div className="flex items-center justify-between"><span className="text-slate-500">Status</span><strong className="text-slate-100">{pin.trip_status}</strong></div>}
                  <div className="flex items-center justify-between"><span className="text-slate-500">Date</span><strong className="font-data text-slate-100">{formatDateTime(pin.pin_date)}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Driver Verified</span><strong className={pin.driver_verified_at ? 'text-emerald-400' : 'text-slate-500'}>{pin.driver_verified_at ? '✓ Yes' : 'Not yet'}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Conductor Verified</span><strong className={pin.conductor_verified_at ? 'text-emerald-400' : 'text-slate-500'}>{pin.conductor_verified_at ? '✓ Yes' : 'Not yet'}</strong></div>
                  {pin.both_verified && (
                    <div className="mt-2 rounded-xl border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-center text-xs font-semibold text-emerald-300">
                      ✓ Both verified — trip is cleared for departure
                    </div>
                  )}
                </div>
              </article>
            )}

            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-lg font-semibold text-slate-100">Verify PIN</h3>
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
          </section>
        )}
      </main>
    </div>
  );
}
