import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import QrScanner from 'qr-scanner';
import StaffService from '../../api/StaffService/StaffService';
import usePassengersByTrip from '../../api/hooks/Staff/usePassengersByTrip';
import useOnsiteReceiptPrinter from '../../api/hooks/Staff/useOnsiteReceiptPrinter';
import PairingScreen from './PairingScreen';

const NAV_ITEMS = [
  { key: 'trip', label: 'Start', icon: Play },
  { key: 'occupancy', label: 'Ticketing', icon: Ticket },
  { key: 'earnings', label: 'End Shift', icon: BarChart3 },
  { key: 'passengers', label: 'Passengers', icon: Users },
  { key: 'pin', label: 'Daily PIN', icon: KeyRound },
  { key: 'account', label: 'Account', icon: UserCheck },
];

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

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

export default function ConductorDashboard() {
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
        const res = await StaffService.getPairingStatus('conductor');
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
    await StaffService.logoutConductor().catch(() => {});
    navigate('/employee/login');
  };

  return (
    <ConductorDashboardInner
      onLogout={handleLogout}
      pairing={pairing}
      refreshPairingStatus={refreshPairingStatus}
    />
  );
}

function ConductorDashboardInner({ onLogout, pairing, refreshPairingStatus }) {
  const [activeTab, setActiveTab] = useState('trip');
  const [profile, setProfile] = useState(null);
  const [trip, setTrip] = useState(null);
  const [assignedTrips, setAssignedTrips] = useState([]);
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
  const [startedShiftTripId, setStartedShiftTripId] = useState(null);
  const isPaired = pairing?.paired === true;
  const pairingReason = pairing?.reason || 'Waiting for pairing with your Driver before live trip features unlock.';
  const hasActiveTrip = isCurrentOrSameDayTrip(trip);
  const didBootstrap = useRef(false);
  const videoRef = useRef(null);
  const scannerStreamRef = useRef(null);
  const scannerTimerRef = useRef(null);
  const scannerBusyRef = useRef(false);
  const lastDetectedRef = useRef({ value: '', at: 0 });
  const upcomingTrip = getUpcomingTrip(assignedTrips);
  const showNoCurrentTripState = !loading && isPaired && !hasActiveTrip && ['trip', 'occupancy', 'passengers', 'pin'].includes(activeTab);
  const routeStops = trip?.fleet_route?.route?.route_stops || trip?.fleet_route?.route?.routeStops || [];
  const shiftStarted = Boolean(trip?.trip_id) && Number(startedShiftTripId) === Number(trip?.trip_id);
  const groupedPassengers = usePassengersByTrip(passengers, trip);
  const { printOnsiteReceipt } = useOnsiteReceiptPrinter();

  const handleTwoFactorToggle = async (event) => {
    const enabled = event.target.checked;
    setTwoFactorEnabled(enabled);
    setSaving2fa(true);
    setActionMsg('');

    try {
      await StaffService.setTwoFactorPreference(enabled, 'conductor');
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
    try {
      const [profileRes, tripRes, tripsRes] = await Promise.allSettled([
        StaffService.getProfile('conductor'),
        StaffService.getConductorTrip(),
        StaffService.getConductorTrips(),
      ]);
      if (profileRes.status === 'fulfilled') {
        const nextProfile = profileRes.value?.data;
        setProfile(nextProfile);
        if (typeof nextProfile?.user?.two_factor_enabled === 'boolean') {
          setTwoFactorEnabled(nextProfile.user.two_factor_enabled);
        }
      }
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
      return;
    }
    try {
      await StaffService.getConductorPin();
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
      const res = await StaffService.getTripEarnings('conductor');
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
      if (activeTab === 'passengers' && hasActiveTrip && isPaired) void loadPassengers();
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
      if (activeTab === 'earnings' && hasActiveTrip && isPaired) void loadEarnings();
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab, hasActiveTrip, isPaired, loadEarnings]);

  useEffect(() => {
    if (showScannerModal) return undefined;
    const timer = setTimeout(() => {
      stopScanner();
    }, 0);
    return () => clearTimeout(timer);
  }, [showScannerModal, stopScanner]);

  useEffect(() => {
    if (!trip?.trip_id) {
      setStartedShiftTripId(null);
      return;
    }

    const normalized = String(trip?.status || '').toLowerCase();
    if (['boarding', 'departed', 'in-progress', 'completed'].includes(normalized)) {
      setStartedShiftTripId(Number(trip.trip_id));
    }
  }, [trip?.trip_id, trip?.status]);

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
      const res = await StaffService.scanTicket(ticketUuid);
      setScanResult({ success: true, data: res?.data, msg: res?.message });
      setActionMsg('Ticket scanned successfully.');
      setScanUuid(ticketUuid);
      setScannerPhase('success');
      setScannerStatus('Ticket validated. Ready for next scan.');
      void loadOccupancy();
      void loadPassengers();
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
  }, [isPaired, loadOccupancy, pairingReason, scanUuid, trip?.trip_id]);

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
      const res = await StaffService.scanGroupTickets(transactionRef);
      setGroupScanResult({ success: true, data: res?.data, msg: res?.message });
      setActionMsg(`${res?.data?.boarded_count ?? 0} ticket(s) boarded.`);
      setScannerPhase('success');
      setScannerStatus('Group ticket validated. Ready for next scan.');
      void loadOccupancy();
      void loadPassengers();
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
  }, [isPaired, loadOccupancy, pairingReason, trip?.trip_id]);

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
  }, [extractTicketUuid, handleGroupScan, handleScan, isPaired, pairingReason, stopScanner, trip?.trip_id]);

  const handleAlight = async (ticketId) => {
    if (!isPaired) {
      setActionMsg(pairingReason);
      return;
    }

    try {
      await StaffService.recordAlighting(ticketId);
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
      await StaffService.verifyConductorPin(pinInput);
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
      const res = await StaffService.checkoutOnsite({
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
    } catch (err) {
      setOnsiteReceipt(null);
      setActionMsg(err.message || 'Failed to record onsite checkout.');
    } finally {
      setCheckoutInFlight(false);
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

        {!loading && activeTab === 'trip' && !isPaired && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="text-lg font-bold text-amber-800">Pairing required to start shift</h3>
            <p className="mt-2 text-sm text-amber-700">{pairingReason}</p>
          </section>
        )}

        {!loading && activeTab === 'trip' && isPaired && !showNoCurrentTripState && (
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
                    <p className="font-bold text-slate-900">{trip?.fleet_route?.fleet?.plate_number ?? 'Bus #1'}</p>
                    <p className="text-xs text-slate-500">{trip?.fleet_route?.fleet?.make ?? 'Assigned Fleet'}</p>
                  </div>
                </div>
              </div>

              {/* Trip info card */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Current Trip Info</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Route</span>
                    <span className="font-semibold text-slate-900">{trip?.fleet_route?.route?.route_name ?? '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status</span>
                    <span className="font-semibold capitalize text-teal-600">{trip?.status ?? '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Schedule</span>
                    <span className="font-data text-slate-700">{formatTripSchedule(trip)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Start shift button */}
            <div className="mt-6 text-center">
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-8 py-3 text-sm font-bold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => {
                  if (trip?.trip_id) {
                    setStartedShiftTripId(Number(trip.trip_id));
                  }
                  setActiveTab('occupancy');
                }}
                disabled={shiftStarted}
              >
                {shiftStarted ? 'SHIFT STARTED' : 'CONFIRM & START SHIFT'}
                <Play className="h-4 w-4" />
              </button>
              <p className="mt-3 text-xs text-slate-400">This will take you to the Ticketing screen</p>
            </div>
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
                    <div className="flex items-center justify-between"><span className="text-slate-500">Schedule</span><strong className="font-data text-slate-100">{formatTripSchedule(item)}</strong></div>
                    <div className="flex items-center justify-between"><span className="text-slate-500">Fleet</span><strong className="text-slate-100">{item.fleet_route?.fleet?.plate_number || `Fleet ${item.fleet_route?.fleet_id || '-'}`}</strong></div>
                    <div className="flex items-center justify-between"><span className="text-slate-500">Route</span><strong className="text-slate-100">{item.fleet_route?.route?.route_name || `Route ${item.fleet_route?.route_id || '-'}`}</strong></div>
                  </div>
                </article>
              ))
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
                        disabled={checkoutInFlight || !hasActiveTrip || !isPaired}
                      >
                        {checkoutInFlight ? 'Processing...' : 'Generate Ticket'}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        onClick={() => setShowScannerModal(true)}
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
                          className="flex items-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-600"
                          onClick={() => void startScanner()}
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
                      disabled={scannerBusy}
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
                        groupScanResult.success
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
                <button className="rounded-lg bg-teal-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-600">
                  Verify &amp; End Shift
                </button>
              </div>
            </div>

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
    </div>
  );
}
