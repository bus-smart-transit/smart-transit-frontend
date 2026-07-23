import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  Bus,
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
import StaffService from '../../api/StaffService/StaffService';
import usePassengersByTrip from '../../api/hooks/Staff/usePassengersByTrip';
import useOnsiteReceiptPrinter from '../../api/hooks/Staff/useOnsiteReceiptPrinter';

const NAV_ITEMS = [
  { key: 'trip', label: 'Current Trip', icon: Bus },
  { key: 'assigned', label: 'Assigned Trips', icon: Calendar },
  { key: 'occupancy', label: 'Occupancy', icon: BarChart3 },
  { key: 'scan', label: 'Scan Ticket', icon: QrCode },
  { key: 'passengers', label: 'Passengers', icon: Users },
  { key: 'pin', label: 'Daily PIN', icon: KeyRound },
];

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

export default function ConductorDashboard() {
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
  const hasActiveTrip = !!trip?.trip_id;
  const didBootstrap = useRef(false);
  const routeStops = trip?.fleet_route?.route?.route_stops || trip?.fleet_route?.route?.routeStops || [];
  const groupedPassengers = usePassengersByTrip(passengers, trip);
  const { printOnsiteReceipt } = useOnsiteReceiptPrinter();

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

  const handleScan = async () => {
    if (!trip?.trip_id) {
      setScanResult({ success: false, msg: 'No active trip assigned. Ticket scanning is unavailable.' });
      return;
    }
    setScanResult(null);
    try {
      const res = await StaffService.scanTicket(scanUuid);
      setScanResult({ success: true, data: res?.data, msg: res?.message });
      setActionMsg('Ticket scanned successfully.');
      void loadOccupancy();
    } catch (err) {
      setScanResult({ success: false, msg: err.message });
    }
  };

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

  const handleLogout = async () => {
    await StaffService.logout('conductor').catch(() => {});
    navigate('/employee/login');
  };

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

        {!loading && activeTab === 'trip' && (
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

        {!loading && activeTab === 'occupancy' && (
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
              <p className="mt-2 text-sm text-slate-500">Enter ticket UUID to validate a passenger ticket.</p>

              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="ticket-uuid-here"
                  value={scanUuid}
                  onChange={(e) => {
                    setScanUuid(e.target.value);
                    setScanResult(null);
                  }}
                  className="font-data h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400"
                />
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                  onClick={handleScan}
                >
                  <QrCode className="h-4 w-4" />
                  Scan
                </button>
              </div>

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

        {!loading && activeTab === 'passengers' && (
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

        {!loading && activeTab === 'pin' && (
          <section className="grid max-w-3xl gap-4 md:grid-cols-2">
            {pin && (
              <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <h3 className="text-lg font-semibold text-slate-100">Today's PIN Code</h3>
                <div className="font-data mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950 p-4 text-center text-2xl font-bold tracking-[0.2em] text-slate-100">
                  {pin.pin_code}
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-slate-500">Trip</span><strong className="font-data text-slate-100">#{pin.trip_id ?? '-'}</strong></div>
                  {pin.route_name && <div className="flex items-center justify-between"><span className="text-slate-500">Route</span><strong className="text-slate-100">{pin.route_name}</strong></div>}
                  {pin.fleet_plate_number && <div className="flex items-center justify-between"><span className="text-slate-500">Fleet</span><strong className="text-slate-100">{pin.fleet_plate_number}</strong></div>}
                  {pin.trip_status && <div className="flex items-center justify-between"><span className="text-slate-500">Status</span><strong className="text-slate-100">{pin.trip_status}</strong></div>}
                  <div className="flex items-center justify-between"><span className="text-slate-500">Date</span><strong className="font-data text-slate-100">{formatDateTime(pin.pin_date)}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-slate-500">Verified</span><strong className="text-slate-100">{pin.conductor_verified_at ? 'Yes' : 'Not yet'}</strong></div>
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
