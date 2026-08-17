import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import StaffService from '../../api/StaffService/StaffService';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bus,
  Calendar,
  CheckCircle,
  CreditCard,
  DollarSign,
  Loader,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'fleets', label: 'Fleet Management', icon: Bus },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'trips', label: 'Schedule Trips', icon: Calendar },
  { id: 'trip-mgmt', label: 'Trip Management', icon: Target },
  { id: 'reports', label: 'Advanced Reports', icon: TrendingUp },
];

const REPORT_ACTIONS = [
  { id: 'financial', label: 'Financial Report', icon: DollarSign, color: 'text-emerald-400' },
  { id: 'revenue', label: 'Revenue by Route', icon: BarChart3, color: 'text-sky-400' },
  { id: 'adherence', label: 'Route Adherence', icon: ShieldCheck, color: 'text-emerald-400' },
  { id: 'occupancy', label: 'Occupancy Trends', icon: Activity, color: 'text-amber-400' },
  { id: 'daily', label: 'Daily Summary', icon: Calendar, color: 'text-indigo-400' },
  { id: 'channels', label: 'Payment Channels', icon: CreditCard, color: 'text-cyan-400' },
];

const asCurrency = (value) => `P${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

const toRows = (data) => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.routes)) return data.routes;
  if (Array.isArray(data.records)) return data.records;
  return [];
};

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const didBootstrap = useRef(false);
  const [reportDateMax] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [saving2fa, setSaving2fa] = useState(false);

  const [fleets, setFleets] = useState([]);
  const [fleetForm, setFleetForm] = useState({
    plate_number: '',
    seated_capacity: '',
    standing_capacity: '',
    fleet_type: 'public',
  });
  const [addingFleet, setAddingFleet] = useState(false);

  const [drivers, setDrivers] = useState([]);
  const [conductors, setConductors] = useState([]);
  const [empForm, setEmpForm] = useState({
    name: '',
    email: '',
    phone_num: '',
    address: '',
    username: '',
    role: 'driver',
    password: '',
  });
  const [creatingEmp, setCreatingEmp] = useState(false);

  const [trips, setTrips] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [fleetRouteOptions, setFleetRouteOptions] = useState([]);
  const [tripForm, setTripForm] = useState({ fleet_route_id: '', trip_date: '', driver_id: '', conductor_id: '' });
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [routeAssignForm, setRouteAssignForm] = useState({ fleet_id: '', route_id: '', start_time: '', end_time: '' });
  const [routeForm, setRouteForm] = useState({ route_name: '', origin: '', destination: '' });
  const [fareRuleForm, setFareRuleForm] = useState({ fleet_id: '', seat_type: 'seated', base_fare: '', fare_per_km: '' });
  const [stopForm, setStopForm] = useState({ stop_name: '', latitude: '', longitude: '' });
  const [stopLocationQuery, setStopLocationQuery] = useState('');
  const [stopLocationResults, setStopLocationResults] = useState([]);
  const [searchingStopLocation, setSearchingStopLocation] = useState(false);
  const [stopLocationConfirm, setStopLocationConfirm] = useState(null);
  const [stopLocationSearched, setStopLocationSearched] = useState(false);
  const [stopMapPin, setStopMapPin] = useState(null); // { lat, lon } — controls map pin
  const [routeStopForm, setRouteStopForm] = useState({ route_id: '', stop_id: '', stop_order: '', distance_from_origin_km: '' });
  const [selectedRouteStops, setSelectedRouteStops] = useState([]);
  const [loadingRouteStops, setLoadingRouteStops] = useState(false);
  const [assigningRoute, setAssigningRoute] = useState(false);
  const [creatingRoute, setCreatingRoute] = useState(false);
  const [creatingFareRule, setCreatingFareRule] = useState(false);
  const [creatingStop, setCreatingStop] = useState(false);
  const [addingStopToRoute, setAddingStopToRoute] = useState(false);

  const [selectedFleet, setSelectedFleet] = useState('');
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportType, setReportType] = useState('financial');
  const [advancedReports, setAdvancedReports] = useState({});
  const [reportRange, setReportRange] = useState(() => {
    const now = new Date();
    const end = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
    return {
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      date: end.toISOString().split('T')[0],
    };
  });

  const showMessage = (msg, isSuccess = true) => {
    if (isSuccess) {
      setSuccessMsg(msg);
      setError('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setError(msg);
      setSuccessMsg('');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleTwoFactorToggle = async (event) => {
    const enabled = event.target.checked;
    setTwoFactorEnabled(enabled);
    setSaving2fa(true);
    try {
      await StaffService.setTwoFactorPreference(enabled);
      showMessage(enabled ? '2FA enabled for your account.' : '2FA disabled for your account.', true);
    } catch (err) {
      setTwoFactorEnabled(!enabled);
      showMessage(err?.message || 'Failed to update 2FA preference.', false);
    } finally {
      setSaving2fa(false);
    }
  };

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        profileRes,
        fleetsRes,
        driversRes,
        conductorsRes,
        routesRes,
        stopsRes,
        fleetRoutesRes,
        upcomingTripsRes,
      ] = await Promise.all([
        StaffService.getProfile('operator'),
        StaffService.getOperatorFleets(),
        StaffService.getOperatorDrivers(),
        StaffService.getOperatorConductors(),
        StaffService.getOperatorRoutes(),
        StaffService.getOperatorStops(),
        StaffService.getOperatorFleetRoutes(),
        StaffService.getOperatorTrips(),
      ]);

      setProfile(profileRes.data);
      if (typeof profileRes.data?.user?.two_factor_enabled === 'boolean') {
        setTwoFactorEnabled(profileRes.data.user.two_factor_enabled);
      }
      setFleets(fleetsRes.data || []);
      setDrivers(driversRes.data || []);
      setConductors(conductorsRes.data || []);
      setRoutes(routesRes.data || []);
      setStops(stopsRes.data || []);
      setFleetRouteOptions(fleetRoutesRes?.data || []);
      setTrips(upcomingTripsRes?.data || []);
    } catch (err) {
      showMessage(err?.message || 'Failed to load dashboard', false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!didBootstrap.current) {
      didBootstrap.current = true;
      loadDashboardData();
    }
  }, [loadDashboardData]);

  const handleAddFleet = async () => {
    if (!fleetForm.plate_number || !fleetForm.seated_capacity || !fleetForm.standing_capacity) {
      showMessage('Please fill all required fleet fields', false);
      return;
    }

    setAddingFleet(true);
    try {
      const res = await StaffService.createFleet({
        plate_number: fleetForm.plate_number,
        seated_capacity: parseInt(fleetForm.seated_capacity),
        standing_capacity: parseInt(fleetForm.standing_capacity),
        fleet_type: fleetForm.fleet_type,
      });
      setFleets([...fleets, res.data]);
      setFleetForm({ plate_number: '', seated_capacity: '', standing_capacity: '', fleet_type: 'public' });
      showMessage('Fleet added successfully!', true);
    } catch (err) {
      showMessage(err?.message || 'Failed to create fleet', false);
    } finally {
      setAddingFleet(false);
    }
  };

  const handleCreateEmployee = async () => {
    if (!empForm.name || !empForm.email || !empForm.password || !empForm.phone_num) {
      showMessage('Name, Email, Phone, and Password are required', false);
      return;
    }

    setCreatingEmp(true);
    try {
      const res = await StaffService.createEmployeeAccount({
        name: empForm.name,
        email: empForm.email,
        password: empForm.password,
        phone_num: empForm.phone_num,
        address: empForm.address || null,
        username: empForm.username || null,
        role: empForm.role,
      });
      
      if (empForm.role === 'driver') {
        setDrivers([...drivers, res.data]);
      } else {
        setConductors([...conductors, res.data]);
      }
      
      setEmpForm({ name: '', email: '', phone_num: '', address: '', username: '', role: 'driver', password: '' });
      showMessage(`${empForm.role} account created successfully!`, true);
    } catch (err) {
      showMessage(err?.message || 'Failed to create account', false);
    } finally {
      setCreatingEmp(false);
    }
  };

  const handleScheduleTrip = async () => {
    if (!tripForm.fleet_route_id || !tripForm.trip_date || !tripForm.driver_id || !tripForm.conductor_id) {
      showMessage('Please select a fleet route, trip date, driver, and conductor', false);
      return;
    }

    setCreatingTrip(true);
    try {
      const res = await StaffService.scheduleTrip({
        fleet_route_id: parseInt(tripForm.fleet_route_id),
        trip_date: tripForm.trip_date,
        driver_id: parseInt(tripForm.driver_id),
        conductor_id: parseInt(tripForm.conductor_id),
      });
      
      setTrips([res.data, ...trips]);
      setTripForm({ fleet_route_id: '', trip_date: '', driver_id: '', conductor_id: '' });
      showMessage('Trip scheduled successfully!', true);

      const upcomingTripsRes = await StaffService.getOperatorTrips();
      setTrips(upcomingTripsRes?.data || []);
    } catch (err) {
      showMessage(err?.message || 'Failed to schedule trip', false);
    } finally {
      setCreatingTrip(false);
    }
  };

  const handleAssignRouteToFleet = async () => {
    if (!routeAssignForm.fleet_id || !routeAssignForm.route_id || !routeAssignForm.start_time || !routeAssignForm.end_time) {
      showMessage('Please select fleet, route, start time, and end time', false);
      return;
    }

    setAssigningRoute(true);
    try {
      await StaffService.assignRouteToFleet(parseInt(routeAssignForm.fleet_id), {
        route_id: parseInt(routeAssignForm.route_id),
        start_time: routeAssignForm.start_time,
        end_time: routeAssignForm.end_time,
      });

      const fleetRoutesRes = await StaffService.getOperatorFleetRoutes();
      setFleetRouteOptions(fleetRoutesRes?.data || []);
      setRouteAssignForm({ fleet_id: '', route_id: '', start_time: '', end_time: '' });
      showMessage('Route assigned to fleet successfully!', true);
    } catch (err) {
      showMessage(err?.message || 'Failed to assign route to fleet', false);
    } finally {
      setAssigningRoute(false);
    }
  };

  const handleCreateFareRule = async () => {
    if (!fareRuleForm.fleet_id || !fareRuleForm.base_fare || !fareRuleForm.fare_per_km || !fareRuleForm.seat_type) {
      showMessage('Please complete all fare rule fields', false);
      return;
    }

    setCreatingFareRule(true);
    try {
      await StaffService.createFareRule({
        fleet_id: parseInt(fareRuleForm.fleet_id),
        seat_type: fareRuleForm.seat_type,
        base_fare: Number(fareRuleForm.base_fare),
        fare_per_km: Number(fareRuleForm.fare_per_km),
      });

      setFareRuleForm({ fleet_id: '', seat_type: 'seated', base_fare: '', fare_per_km: '' });
      showMessage('Fare rule created successfully!', true);
    } catch (err) {
      showMessage(err?.message || 'Failed to create fare rule', false);
    } finally {
      setCreatingFareRule(false);
    }
  };

  const handleSearchStopLocation = async () => {
    if (!stopLocationQuery.trim()) return;
    setSearchingStopLocation(true);
    setStopLocationResults([]);
    setStopLocationSearched(false);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(stopLocationQuery)}&limit=5`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      setStopLocationResults(data ?? []);
      setStopLocationSearched(true);
    } catch {
      showMessage('Location search failed. Please check your connection and try again.', false);
    } finally {
      setSearchingStopLocation(false);
    }
  };

  const handlePickStopLocation = (result) => {
    const lat = parseFloat(result.lat).toFixed(6);
    const lon = parseFloat(result.lon).toFixed(6);
    setStopLocationConfirm({
      display_name: result.display_name,
      short_name: result.display_name.split(',')[0].trim(),
      lat,
      lon,
    });
    setStopMapPin({ lat: Number(lat), lon: Number(lon) });
    setStopLocationResults([]);
    setStopLocationQuery('');
    setStopLocationSearched(false);
  };

  const handleConfirmStopLocation = () => {
    if (!stopLocationConfirm) return;
    setStopForm((prev) => ({
      ...prev,
      stop_name: prev.stop_name || stopLocationConfirm.short_name,
      latitude: Number(stopLocationConfirm.lat),
      longitude: Number(stopLocationConfirm.lon),
    }));
    setStopLocationConfirm(null);
    // Keep the pin on the map after confirming
  };

  const handleRejectStopLocation = () => {
    setStopLocationConfirm(null);
    setStopMapPin(null);
  };

  const handleCreateStop = async () => {
    if (!stopForm.stop_name || !stopForm.latitude || !stopForm.longitude) {
      showMessage('Please complete all stop fields', false);
      return;
    }

    setCreatingStop(true);
    try {
      const res = await StaffService.createOperatorStop({
        stop_name: stopForm.stop_name,
        latitude: Number(stopForm.latitude),
        longitude: Number(stopForm.longitude),
      });

      setStops((prev) => [res.data, ...prev]);
      setStopForm({ stop_name: '', latitude: '', longitude: '' });
      setStopMapPin(null);
      showMessage('Stop created successfully!', true);
    } catch (err) {
      showMessage(err?.message || 'Failed to create stop', false);
    } finally {
      setCreatingStop(false);
    }
  };

  const handleCreateRoute = async () => {
    if (!routeForm.route_name || !routeForm.origin || !routeForm.destination) {
      showMessage('Please complete route name, origin, and destination', false);
      return;
    }

    setCreatingRoute(true);
    try {
      const res = await StaffService.createOperatorRoute({
        route_name: routeForm.route_name,
        origin: routeForm.origin,
        destination: routeForm.destination,
      });

      setRoutes((prev) => [res?.data, ...prev]);
      setRouteForm({ route_name: '', origin: '', destination: '' });
      showMessage('Route created successfully!', true);
    } catch (err) {
      showMessage(err?.message || 'Failed to create route', false);
    } finally {
      setCreatingRoute(false);
    }
  };

  const handleAddStopToRoute = async () => {
    if (!routeStopForm.route_id || !routeStopForm.stop_id || !routeStopForm.stop_order) {
      showMessage('Please select a route, stop, and stop order', false);
      return;
    }

    setAddingStopToRoute(true);
    try {
      await StaffService.addOperatorStopToRoute(parseInt(routeStopForm.route_id), {
        stop_id: parseInt(routeStopForm.stop_id),
        stop_order: parseInt(routeStopForm.stop_order),
        distance_from_origin_km: Number(routeStopForm.distance_from_origin_km) || 0,
      });

      setRouteStopForm({ route_id: '', stop_id: '', stop_order: '', distance_from_origin_km: '' });
      setSelectedRouteStops([]);
      showMessage('Stop applied to route successfully.', true);
    } catch (err) {
      showMessage(err?.message || 'Failed to apply stop to route', false);
    } finally {
      setAddingStopToRoute(false);
    }
  };

  // Haversine straight-line distance in km between two lat/lng points
  const haversineKm = (lat1, lng1, lat2, lng2) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
  };

  const handleRouteStopRouteChange = async (routeId) => {
    setRouteStopForm({ route_id: routeId, stop_id: '', stop_order: '', distance_from_origin_km: '' });
    setSelectedRouteStops([]);
    if (!routeId) return;

    setLoadingRouteStops(true);
    try {
      const res = await StaffService.getOperatorRoute(parseInt(routeId));
      const routeData = res?.data ?? res ?? {};
      const rawStops = routeData?.routeStops ?? routeData?.route_stops ?? [];
      const sorted = [...rawStops].sort((a, b) => (a.stop_order ?? 0) - (b.stop_order ?? 0));
      setSelectedRouteStops(sorted);
      setRouteStopForm((prev) => ({ ...prev, stop_order: String(sorted.length + 1) }));
    } catch {
      setSelectedRouteStops([]);
    } finally {
      setLoadingRouteStops(false);
    }
  };

  const handleRouteStopStopChange = (stopId) => {
    if (!stopId) {
      setRouteStopForm((prev) => ({ ...prev, stop_id: '', distance_from_origin_km: '' }));
      return;
    }

    // Find the selected stop's coordinates from the local stops list
    const selectedStop = stops.find((s) => String(s.stop_id) === String(stopId));
    const newLat = Number(selectedStop?.latitude ?? 0);
    const newLng = Number(selectedStop?.longitude ?? 0);

    if (!selectedRouteStops.length || !Number.isFinite(newLat) || !Number.isFinite(newLng)) {
      // First stop on this route, or no coordinates — distance from origin is 0
      setRouteStopForm((prev) => ({ ...prev, stop_id: stopId, distance_from_origin_km: '0' }));
      return;
    }

    // Build coordinate chain through existing route stops in order
    const chain = selectedRouteStops
      .map((rs) => {
        const s = rs.stop ?? stops.find((x) => x.stop_id === rs.stop_id) ?? null;
        return s ? { lat: Number(s.latitude), lng: Number(s.longitude) } : null;
      })
      .filter((c) => c && Number.isFinite(c.lat) && Number.isFinite(c.lng));

    // Cumulative distance along the chain
    let total = 0;
    for (let i = 1; i < chain.length; i++) {
      total += haversineKm(chain[i - 1].lat, chain[i - 1].lng, chain[i].lat, chain[i].lng);
    }

    // Add leg from last existing stop to the new stop
    if (chain.length > 0) {
      const last = chain[chain.length - 1];
      total += haversineKm(last.lat, last.lng, newLat, newLng);
    }

    setRouteStopForm((prev) => ({
      ...prev,
      stop_id: stopId,
      distance_from_origin_km: total.toFixed(2),
    }));
  };

  const loadAdvancedReport = async (type) => {
    if (!selectedFleet) {
      showMessage('Please select a fleet', false);
      return;
    }

    setLoadingReport(true);
    try {
      let res;
      const rangeParams = {
        start_date: reportRange.start_date,
        end_date: reportRange.end_date,
      };

      if (type === 'financial') res = await StaffService.getFinancialReport(selectedFleet, rangeParams);
      else if (type === 'revenue') res = await StaffService.getRevenueByRoute(selectedFleet, rangeParams);
      else if (type === 'adherence') res = await StaffService.getRouteAdherence(selectedFleet, rangeParams);
      else if (type === 'occupancy') res = await StaffService.getOccupancyTrends(selectedFleet, rangeParams);
      else if (type === 'daily') res = await StaffService.getDailySummary(selectedFleet, { date: reportRange.date });
      else if (type === 'channels') res = await StaffService.getPaymentChannels(selectedFleet, rangeParams);
      
      setAdvancedReports((prev) => ({ ...prev, [type]: res.data }));
      setReportType(type);
      showMessage('Report loaded successfully', true);
    } catch (err) {
      showMessage(err?.message || 'Failed to load report', false);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleLogout = async () => {
    await StaffService.logout('operator').catch(() => {});
    navigate('/employee/login', { replace: true });
  };

  const printReportsPdf = () => {
    const report = advancedReports[reportType];
    if (!report) {
      showMessage('Generate a report first before printing.', false);
      return;
    }

    const popup = window.open('', '_blank', 'width=1100,height=800');
    if (!popup) {
      showMessage('Unable to open print window. Please allow popups.', false);
      return;
    }

    const toRows = (value, prefix = '') => {
      if (Array.isArray(value)) {
        return value.flatMap((item, idx) => toRows(item, `${prefix}[${idx}]`));
      }

      if (value && typeof value === 'object') {
        return Object.entries(value).flatMap(([key, val]) => {
          const nextPrefix = prefix ? `${prefix}.${key}` : key;
          return toRows(val, nextPrefix);
        });
      }

      return [[prefix || 'value', value == null ? '-' : String(value)]];
    };

    const sections = Object.entries(report || {}).map(([key, value]) => {
      const rows = toRows(value);
      const body = rows.map(([label, val]) => `
        <tr>
          <td>${label}</td>
          <td>${val}</td>
        </tr>
      `).join('');

      return `
        <section class="report-section">
          <h2>${key.replaceAll('_', ' ')}</h2>
          <table>
            <thead>
              <tr><th>Field</th><th>Value</th></tr>
            </thead>
            <tbody>${body || '<tr><td colspan="2">No data</td></tr>'}</tbody>
          </table>
        </section>
      `;
    }).join('');

    popup.document.write(`
      <html>
        <head>
          <title>Operator Report - ${reportType}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            p { margin: 0 0 12px; color: #475569; }
            .report-section { margin-top: 16px; }
            .report-section h2 { margin: 0 0 8px; font-size: 16px; text-transform: capitalize; }
            table { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; vertical-align: top; }
            th { background: #f1f5f9; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Smart Transit Operator Report</h1>
          <p>Type: ${reportType} | Generated: ${formatDateTime(new Date().toISOString())}</p>
          ${sections || '<p>No report data available.</p>'}
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);
    popup.document.close();
  };

  const renderReportBody = () => {
    const report = advancedReports[reportType];
    if (!report) return null;

    if (reportType === 'financial') {
      const revenue = report.revenue || {};
      const tickets = report.tickets || {};
      const trips = report.trips || {};

      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
            <div className="text-xs uppercase text-slate-500">Total Revenue</div>
            <div className="mt-2 text-2xl font-bold text-emerald-400">{asCurrency(revenue.total)}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
            <div className="text-xs uppercase text-slate-500">Online Payments</div>
            <div className="mt-2 text-2xl font-bold text-sky-400">{asCurrency(revenue.online)}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
            <div className="text-xs uppercase text-slate-500">Cash Payments</div>
            <div className="mt-2 text-2xl font-bold text-amber-400">{asCurrency(revenue.onsite_cash)}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
            <div className="text-xs uppercase text-slate-500">Completed Trips</div>
            <div className="mt-2 text-2xl font-bold text-indigo-400">{Number(trips.completed || 0)}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 md:col-span-2 xl:col-span-2">
            <div className="text-xs uppercase text-slate-500">Tickets Issued</div>
            <div className="mt-2 text-xl font-bold text-slate-100">{Number(tickets.total || 0)}</div>
            <p className="mt-1 text-xs text-slate-500">Avg per completed trip: {Number(tickets.average_per_trip || 0).toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 md:col-span-2 xl:col-span-2">
            <div className="text-xs uppercase text-slate-500">Average Revenue / Trip</div>
            <div className="mt-2 text-xl font-bold text-slate-100">{asCurrency(trips.average_revenue_per_trip)}</div>
            <p className="mt-1 text-xs text-slate-500">Period: {report.period?.start_date || '-'} to {report.period?.end_date || '-'}</p>
          </div>
        </div>
      );
    }

    if (reportType === 'daily') {
      const summary = report.summary || {};
      const entries = Object.entries(summary);
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 md:col-span-2 xl:col-span-3">
            <div className="text-xs uppercase text-slate-500">Report Date</div>
            <div className="mt-2 text-lg font-semibold text-slate-100">{report.date || 'N/A'}</div>
          </div>
          {entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950 p-6 text-sm text-slate-400">No daily summary data yet.</div>
          ) : (
            entries.map(([key, val]) => (
              <div key={key} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                <div className="text-xs uppercase text-slate-500">{key.replaceAll('_', ' ')}</div>
                <div className="mt-2 text-lg font-semibold text-slate-100">{typeof val === 'number' ? val.toLocaleString() : String(val)}</div>
              </div>
            ))
          )}
        </div>
      );
    }

    if (reportType === 'revenue') {
      const rows = report.routes || [];
      return (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="min-w-full divide-y divide-slate-700 bg-slate-950 text-sm">
            <thead className="bg-slate-900/80 text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Route</th>
                <th className="px-4 py-3 text-left font-semibold">Total Revenue</th>
                <th className="px-4 py-3 text-left font-semibold">Online</th>
                <th className="px-4 py-3 text-left font-semibold">Cash</th>
                <th className="px-4 py-3 text-left font-semibold">Trips</th>
                <th className="px-4 py-3 text-left font-semibold">Tickets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">No route revenue data in this date range.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.route_id || row.route_name} className="hover:bg-slate-900/70">
                    <td className="px-4 py-3 font-medium text-slate-100">{row.route_name || `Route ${row.route_id}`}</td>
                    <td className="px-4 py-3">{asCurrency(row.total_revenue)}</td>
                    <td className="px-4 py-3">{asCurrency(row.online_revenue)}</td>
                    <td className="px-4 py-3">{asCurrency(row.onsite_revenue)}</td>
                    <td className="px-4 py-3">{Number(row.total_trips || 0)}</td>
                    <td className="px-4 py-3">{Number(row.total_tickets || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      );
    }

    if (reportType === 'adherence') {
      const otp = report.on_time_performance || {};
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
            <div className="text-xs uppercase text-slate-500">On-time %</div>
            <div className="mt-2 text-2xl font-bold text-emerald-400">{Number(otp.on_time_percentage || 0).toFixed(2)}%</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
            <div className="text-xs uppercase text-slate-500">Total Trips</div>
            <div className="mt-2 text-2xl font-bold text-slate-100">{Number(otp.total_trips || 0)}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
            <div className="text-xs uppercase text-slate-500">On-time Trips</div>
            <div className="mt-2 text-2xl font-bold text-sky-400">{Number(otp.on_time_trips || 0)}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
            <div className="text-xs uppercase text-slate-500">Delayed Trips</div>
            <div className="mt-2 text-2xl font-bold text-amber-400">{Number(otp.delayed_trips || 0)}</div>
          </div>
        </div>
      );
    }

    if (reportType === 'occupancy') {
      const occ = report.occupancy || {};
      const peakHours = Object.entries(report.peak_hours || {});
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <div className="text-xs uppercase text-slate-500">Average Occupancy</div>
              <div className="mt-2 text-2xl font-bold text-slate-100">{Number(occ.average || 0).toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <div className="text-xs uppercase text-slate-500">Peak Occupancy</div>
              <div className="mt-2 text-2xl font-bold text-amber-400">{Number(occ.peak || 0)}</div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <div className="text-xs uppercase text-slate-500">Average Utilization</div>
              <div className="mt-2 text-2xl font-bold text-cyan-400">{Number(occ.average_utilization_percentage || 0).toFixed(2)}%</div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <div className="text-xs uppercase text-slate-500">Capacity</div>
              <div className="mt-2 text-2xl font-bold text-indigo-400">{Number(report.capacity || 0)}</div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full divide-y divide-slate-700 bg-slate-950 text-sm">
              <thead className="bg-slate-900/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Hour</th>
                  <th className="px-4 py-3 text-left font-semibold">Avg Occupancy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {peakHours.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-slate-400">No peak-hour occupancy data available.</td>
                  </tr>
                ) : (
                  peakHours.map(([hour, avg]) => (
                    <tr key={hour} className="hover:bg-slate-900/70">
                      <td className="px-4 py-3 font-medium text-slate-100">{hour}:00</td>
                      <td className="px-4 py-3">{Number(avg).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (reportType === 'channels') {
      const rows = report.channels || [];
      return (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="min-w-full divide-y divide-slate-700 bg-slate-950 text-sm">
            <thead className="bg-slate-900/80 text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Channel</th>
                <th className="px-4 py-3 text-left font-semibold">Total Amount</th>
                <th className="px-4 py-3 text-left font-semibold">Transactions</th>
                <th className="px-4 py-3 text-left font-semibold">Average Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">No payment channel activity for this period.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.channel || 'unknown'} className="hover:bg-slate-900/70">
                    <td className="px-4 py-3 font-medium text-slate-100">{String(row.channel || 'unknown').replaceAll('_', ' ')}</td>
                    <td className="px-4 py-3">{asCurrency(row.total_amount)}</td>
                    <td className="px-4 py-3">{Number(row.transaction_count || 0)}</td>
                    <td className="px-4 py-3">{asCurrency(row.average_transaction)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      );
    }

    const rows = toRows(report);
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="min-w-full divide-y divide-slate-700 bg-slate-950 text-sm">
          <thead className="bg-slate-900/80 text-slate-300">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Label</th>
              <th className="px-4 py-3 text-left font-semibold">Metric A</th>
              <th className="px-4 py-3 text-left font-semibold">Metric B</th>
              <th className="px-4 py-3 text-left font-semibold">Metric C</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">No report rows available for this range.</td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const label = row.route_name || row.name || row.channel || row.label || row.date || `Row ${idx + 1}`;
                const a = row.revenue ?? row.value ?? row.total ?? row.amount ?? row.count ?? '-';
                const b = row.trips ?? row.rate ?? row.percentage ?? row.volume ?? '-';
                const c = row.occupancy ?? row.status ?? row.share ?? row.change ?? '-';

                return (
                  <tr key={`${label}-${idx}`} className="hover:bg-slate-900/70">
                    <td className="px-4 py-3 font-medium text-slate-100">{String(label)}</td>
                    <td className="px-4 py-3">{typeof a === 'number' && reportType !== 'adherence' ? asCurrency(a) : String(a)}</td>
                    <td className="px-4 py-3">{String(b)}</td>
                    <td className="px-4 py-3">{String(c)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-linear-to-br from-slate-900 to-slate-800 text-slate-200">
      {/* Sidebar */}
      <aside className="w-80 bg-slate-950 border-r border-slate-700 p-6 flex flex-col overflow-y-auto">
        <div className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 text-2xl font-bold text-blue-400">
            <Bus className="h-6 w-6" />
            Smart Transit
          </div>
          <div className="text-xs uppercase tracking-wider text-slate-500">Operator</div>
        </div>

        {profile && (
          <div className="mb-8 rounded-lg bg-slate-900 p-4">
            <div className="flex gap-3">
              <div className="h-12 w-12 shrink-0 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center font-bold text-lg">
              {(profile.name || 'O')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{profile.name}</div>
                <div className="text-xs text-slate-400 truncate">{profile?.user?.email || profile.email}</div>
              </div>
            </div>

            <div className="mt-3 rounded-md border border-slate-700 bg-slate-950 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-200">Login 2FA</p>
                  <p className="text-[11px] text-slate-500">OTP required on sign-in</p>
                </div>
                <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={twoFactorEnabled}
                    onChange={handleTwoFactorToggle}
                    disabled={saving2fa}
                  />
                  {twoFactorEnabled ? 'On' : 'Off'}
                </label>
              </div>
            </div>
          </div>
        )}

        <nav className="relative mb-8 mt-2 flex flex-1 flex-col gap-1 pl-3">
          <div className="absolute bottom-2 left-1.75 top-2 w-px bg-slate-800" aria-hidden="true" />
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className="group relative flex items-center gap-3 rounded-lg py-2.5 pl-5 pr-3 text-sm font-medium"
                onClick={() => {
                  setActiveTab(item.id);
                  setError('');
                  setSuccessMsg('');
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

        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-lg transition font-medium"
          onClick={handleLogout}
        >
          <LogOut size={18} /> Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="flex justify-between items-center px-8 py-6 bg-slate-900/50 border-b border-slate-700">
          <h1 className="text-3xl font-bold">{NAV_ITEMS.find(n => n.id === activeTab)?.label}</h1>
          <button
            className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 rounded-lg transition"
            onClick={loadDashboardData}
          >
            <span className="inline-flex items-center gap-2"><RefreshCw size={14} />Refresh</span>
          </button>
        </div>

        {error && (
          <div className="mx-8 mt-6 flex items-center gap-3 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-red-300">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-8 mt-6 flex items-center gap-3 rounded-lg border border-green-900/50 bg-green-950/30 px-4 py-3 text-green-300">
            <CheckCircle size={18} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader size={32} className="text-blue-400 animate-spin" />
              <p className="text-slate-400">Loading operator dashboard...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="flex gap-4 p-6 bg-slate-900 border border-slate-700 rounded-lg hover:border-slate-600 transition">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-sky-400"><Bus className="h-6 w-6" /></div>
                    <div className="flex-1">
                      <div className="text-xs uppercase text-slate-500 mb-1">Active Fleets</div>
                      <div className="text-3xl font-bold text-blue-400">{fleets.length}</div>
                    </div>
                  </div>
                  <div className="flex gap-4 p-6 bg-slate-900 border border-slate-700 rounded-lg hover:border-slate-600 transition">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-sky-400"><UserRound className="h-6 w-6" /></div>
                    <div className="flex-1">
                      <div className="text-xs uppercase text-slate-500 mb-1">Drivers</div>
                      <div className="text-3xl font-bold text-blue-400">{drivers.length}</div>
                    </div>
                  </div>
                  <div className="flex gap-4 p-6 bg-slate-900 border border-slate-700 rounded-lg hover:border-slate-600 transition">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-sky-400"><Users className="h-6 w-6" /></div>
                    <div className="flex-1">
                      <div className="text-xs uppercase text-slate-500 mb-1">Conductors</div>
                      <div className="text-3xl font-bold text-blue-400">{conductors.length}</div>
                    </div>
                  </div>
                  <div className="flex gap-4 p-6 bg-slate-900 border border-slate-700 rounded-lg hover:border-slate-600 transition">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-sky-400"><Calendar className="h-6 w-6" /></div>
                    <div className="flex-1">
                      <div className="text-xs uppercase text-slate-500 mb-1">Scheduled Trips</div>
                      <div className="text-3xl font-bold text-blue-400">{trips.length}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* FLEETS */}
              {activeTab === 'fleets' && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                    <h2 className="text-xl font-bold mb-4">Add New Fleet</h2>
                    <div className="space-y-4">
                      <input type="text" placeholder="Plate Number *" value={fleetForm.plate_number} onChange={(e) => setFleetForm({ ...fleetForm, plate_number: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 outline-none transition focus:border-sky-500" />
                      <select value={fleetForm.fleet_type} onChange={(e) => setFleetForm({ ...fleetForm, fleet_type: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none transition focus:border-sky-500">
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                      <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Seated Capacity *" value={fleetForm.seated_capacity} onChange={(e) => setFleetForm({ ...fleetForm, seated_capacity: e.target.value })} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 outline-none transition focus:border-sky-500" />
                        <input type="number" placeholder="Standing Capacity *" value={fleetForm.standing_capacity} onChange={(e) => setFleetForm({ ...fleetForm, standing_capacity: e.target.value })} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 outline-none transition focus:border-sky-500" />
                      </div>
                      <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-white font-semibold transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50" onClick={handleAddFleet} disabled={addingFleet}>
                        {addingFleet ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
                        Add Fleet
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                    <h2 className="text-xl font-bold mb-4">Your Fleets ({fleets.length})</h2>
                    <div className="space-y-3">
                      {fleets.length === 0 ? <p className="text-slate-500 text-center py-8">No fleets yet. Add your first vehicle above to start route assignments.</p> : fleets.map(fleet => <div key={fleet.fleet_id} className="p-4 bg-slate-800 border border-slate-700 rounded-lg"><h3 className="font-semibold text-white">{fleet.plate_number}</h3><p className="text-sm text-slate-400 mt-1">Type: {fleet.fleet_type}</p><p className="text-sm text-slate-400">Seated: {fleet.seated_capacity} | Standing: {fleet.standing_capacity}</p></div>)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                    <h2 className="text-xl font-bold mb-4">Assign Route To Fleet</h2>
                    <div className="space-y-4">
                      <select
                        value={routeAssignForm.fleet_id}
                        onChange={(e) => setRouteAssignForm({ ...routeAssignForm, fleet_id: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none transition focus:border-sky-500"
                      >
                        <option value="">Select fleet *</option>
                        {fleets.map((fleet) => (
                          <option key={fleet.fleet_id} value={fleet.fleet_id}>{fleet.plate_number}</option>
                        ))}
                      </select>
                      <select
                        value={routeAssignForm.route_id}
                        onChange={(e) => setRouteAssignForm({ ...routeAssignForm, route_id: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none transition focus:border-sky-500"
                      >
                        <option value="">Select route *</option>
                        {routes.map((route) => (
                          <option key={route.route_id} value={route.route_id}>{route.route_name || `Route ${route.route_id}`}</option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="time"
                          value={routeAssignForm.start_time}
                          onChange={(e) => setRouteAssignForm({ ...routeAssignForm, start_time: e.target.value })}
                          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none transition focus:border-sky-500"
                        />
                        <input
                          type="time"
                          value={routeAssignForm.end_time}
                          onChange={(e) => setRouteAssignForm({ ...routeAssignForm, end_time: e.target.value })}
                          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none transition focus:border-sky-500"
                        />
                      </div>
                      <button
                        className="w-full px-4 py-2 bg-linear-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                        onClick={handleAssignRouteToFleet}
                        disabled={assigningRoute}
                      >
                        {assigningRoute ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
                        Assign Route
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                    <h2 className="text-xl font-bold mb-4">Create Route</h2>
                    <div className="space-y-4">
                      <input
                        type="text"
                        placeholder="Route Name *"
                        value={routeForm.route_name}
                        onChange={(e) => setRouteForm({ ...routeForm, route_name: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 outline-none transition focus:border-sky-500"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Origin *"
                          value={routeForm.origin}
                          onChange={(e) => setRouteForm({ ...routeForm, origin: e.target.value })}
                          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 outline-none transition focus:border-sky-500"
                        />
                        <input
                          type="text"
                          placeholder="Destination *"
                          value={routeForm.destination}
                          onChange={(e) => setRouteForm({ ...routeForm, destination: e.target.value })}
                          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 outline-none transition focus:border-sky-500"
                        />
                      </div>
                      <button
                        className="w-full px-4 py-2 bg-linear-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                        onClick={handleCreateRoute}
                        disabled={creatingRoute}
                      >
                        {creatingRoute ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
                        Create Route
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                    <h2 className="text-xl font-bold mb-4">Create Fare Rule</h2>
                    <div className="space-y-4">
                      <select
                        value={fareRuleForm.fleet_id}
                        onChange={(e) => setFareRuleForm({ ...fareRuleForm, fleet_id: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none transition focus:border-sky-500"
                      >
                        <option value="">Select fleet *</option>
                        {fleets.map((fleet) => (
                          <option key={fleet.fleet_id} value={fleet.fleet_id}>{fleet.plate_number}</option>
                        ))}
                      </select>
                      <select
                        value={fareRuleForm.seat_type}
                        onChange={(e) => setFareRuleForm({ ...fareRuleForm, seat_type: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none transition focus:border-sky-500"
                      >
                        <option value="seated">Seated</option>
                        <option value="standing">Standing</option>
                      </select>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Base Fare *"
                          value={fareRuleForm.base_fare}
                          onChange={(e) => setFareRuleForm({ ...fareRuleForm, base_fare: e.target.value })}
                          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 outline-none transition focus:border-sky-500"
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Fare Per KM *"
                          value={fareRuleForm.fare_per_km}
                          onChange={(e) => setFareRuleForm({ ...fareRuleForm, fare_per_km: e.target.value })}
                          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 outline-none transition focus:border-sky-500"
                        />
                      </div>
                      <button
                        className="w-full px-4 py-2 bg-linear-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                        onClick={handleCreateFareRule}
                        disabled={creatingFareRule}
                      >
                        {creatingFareRule ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
                        Create Fare Rule
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                    <h2 className="text-xl font-bold mb-4">Create Stop</h2>
                    <div className="space-y-4">

                      {/* ── Always-visible map ────────────────────────────── */}
                      <div className="overflow-hidden rounded-xl border border-slate-700">
                        <iframe
                          key={stopMapPin ? `${stopMapPin.lat},${stopMapPin.lon}` : 'default'}
                          title="Stop location map"
                          width="100%"
                          height="260"
                          loading="lazy"
                          className="w-full block"
                          src={
                            stopMapPin
                              ? `https://www.openstreetmap.org/export/embed.html?bbox=${stopMapPin.lon - 0.005},${stopMapPin.lat - 0.005},${stopMapPin.lon + 0.005},${stopMapPin.lat + 0.005}&layer=mapnik&marker=${stopMapPin.lat},${stopMapPin.lon}`
                              : `https://www.openstreetmap.org/export/embed.html?bbox=125.5047,7.0207,125.7047,7.1207&layer=mapnik`
                          }
                        />
                        {!stopMapPin && (
                          <p className="bg-slate-800 px-4 py-2 text-xs text-slate-500 text-center">
                            Search a location above to pin it on the map
                          </p>
                        )}
                        {stopMapPin && !stopLocationConfirm && (
                          <p className="bg-emerald-950/60 px-4 py-2 text-xs text-emerald-300 text-center">
                            📍 {stopForm.latitude}, {stopForm.longitude} — location confirmed
                          </p>
                        )}
                      </div>

                      {/* ── Confirmation banner (appears when result is picked) */}
                      {stopLocationConfirm && (
                        <div className="rounded-xl border border-sky-700 bg-sky-950/30 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400 mb-1">
                            Confirm Location
                          </p>
                          <p className="text-sm font-bold text-slate-100">{stopLocationConfirm.short_name}</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{stopLocationConfirm.display_name}</p>
                          <p className="font-mono text-xs text-sky-300 mt-1">
                            {stopLocationConfirm.lat}, {stopLocationConfirm.lon}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <button
                              type="button"
                              onClick={handleConfirmStopLocation}
                              className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                            >
                              ✓ Yes, use this location
                            </button>
                            <button
                              type="button"
                              onClick={handleRejectStopLocation}
                              className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-400"
                            >
                              ← Search again
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ── Search (hidden while confirming) ──────────────── */}
                      {!stopLocationConfirm && (
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
                            Search Location
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Type address or landmark…"
                              value={stopLocationQuery}
                              onChange={(e) => setStopLocationQuery(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSearchStopLocation()}
                              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 outline-none transition focus:border-sky-500"
                            />
                            <button
                              type="button"
                              onClick={handleSearchStopLocation}
                              disabled={searchingStopLocation || !stopLocationQuery.trim()}
                              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
                            >
                              {searchingStopLocation ? '…' : 'Search'}
                            </button>
                          </div>

                          {stopLocationResults.length > 0 && (
                            <ul className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 divide-y divide-slate-700">
                              {stopLocationResults.map((result) => (
                                <li key={result.place_id}>
                                  <button
                                    type="button"
                                    onClick={() => handlePickStopLocation(result)}
                                    className="w-full px-4 py-3 text-left hover:bg-slate-700 transition"
                                  >
                                    <p className="text-sm font-semibold text-slate-100 truncate">
                                      {result.display_name.split(',')[0].trim()}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">{result.display_name}</p>
                                    <p className="font-mono text-xs text-sky-400 mt-0.5">
                                      {parseFloat(result.lat).toFixed(6)}, {parseFloat(result.lon).toFixed(6)}
                                    </p>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}

                          {stopLocationSearched && stopLocationResults.length === 0 && !searchingStopLocation && (
                            <p className="mt-2 rounded-xl border border-amber-800 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
                              No results found for <strong>"{stopLocationQuery || 'that query'}"</strong>. Try a different spelling or nearby landmark.
                            </p>
                          )}
                        </div>
                      )}

                      {/* ── Stop Name only (lat/lng stored internally) ────── */}
                      <input
                        type="text"
                        placeholder="Stop Name *"
                        value={stopForm.stop_name}
                        onChange={(e) => setStopForm({ ...stopForm, stop_name: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 outline-none transition focus:border-sky-500"
                      />

                      <button
                        className="w-full px-4 py-2 bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                        onClick={handleCreateStop}
                        disabled={creatingStop || !!stopLocationConfirm || !stopForm.latitude || !stopForm.longitude}
                      >
                        {creatingStop ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
                        {!stopForm.latitude ? 'Search and confirm a location first' : 'Create Stop'}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                    <h2 className="text-xl font-bold mb-4">Apply Stop To Route</h2>
                    <div className="space-y-4">

                      <select
                        value={routeStopForm.route_id}
                        onChange={(e) => handleRouteStopRouteChange(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none transition focus:border-sky-500"
                      >
                        <option value="">Select route *</option>
                        {routes.map((route) => (
                          <option key={route.route_id} value={route.route_id}>{route.route_name || `Route ${route.route_id}`}</option>
                        ))}
                      </select>

                      {loadingRouteStops && (
                        <p className="text-xs text-slate-500 animate-pulse">Loading existing stops for this route…</p>
                      )}

                      {selectedRouteStops.length > 0 && (
                        <div className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
                            Existing stops on this route
                          </p>
                          <ol className="space-y-1">
                            {selectedRouteStops.map((rs) => {
                              const name = rs.stop?.stop_name ?? `Stop ${rs.stop_id}`;
                              return (
                                <li key={rs.id ?? rs.stop_id} className="flex items-center gap-2 text-sm text-slate-300">
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-200">
                                    {rs.stop_order}
                                  </span>
                                  {name}
                                  <span className="font-mono text-xs text-slate-500 ml-auto">
                                    {rs.distance_from_origin_km != null ? `${rs.distance_from_origin_km} km` : ''}
                                  </span>
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      )}

                      <select
                        value={routeStopForm.stop_id}
                        onChange={(e) => handleRouteStopStopChange(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none transition focus:border-sky-500"
                        disabled={!routeStopForm.route_id}
                      >
                        <option value="">Select stop to add *</option>
                        {stops
                          .filter((stop) =>
                            !selectedRouteStops.some((rs) => rs.stop_id === stop.stop_id)
                          )
                          .map((stop) => (
                            <option key={stop.stop_id} value={stop.stop_id}>{stop.stop_name}</option>
                          ))
                        }
                      </select>

                      <input
                        type="number"
                        min="1"
                        placeholder="Stop Order / Sequence *"
                        value={routeStopForm.stop_order}
                        onChange={(e) => setRouteStopForm({ ...routeStopForm, stop_order: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 outline-none transition focus:border-sky-500"
                      />

                      {routeStopForm.stop_id && (
                        <div className={`rounded-xl border px-4 py-3 text-sm ${
                          routeStopForm.distance_from_origin_km === '0' || routeStopForm.distance_from_origin_km === ''
                            ? 'border-slate-700 bg-slate-800/60 text-slate-400'
                            : 'border-sky-800 bg-sky-950/30 text-sky-300'
                        }`}>
                          <span className="text-xs uppercase tracking-widest font-semibold block mb-0.5 opacity-70">
                            Auto-calculated distance from origin
                          </span>
                          <span className="font-mono font-bold text-base">
                            {routeStopForm.distance_from_origin_km || '0'} km
                          </span>
                          {routeStopForm.distance_from_origin_km === '0' && (
                            <span className="ml-2 text-xs text-slate-500">(origin stop)</span>
                          )}
                        </div>
                      )}

                      <button
                        className="w-full px-4 py-2 bg-linear-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                        onClick={handleAddStopToRoute}
                        disabled={addingStopToRoute || !routeStopForm.route_id || !routeStopForm.stop_id || !routeStopForm.stop_order}
                      >
                        {addingStopToRoute ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
                        Apply Stop To Route
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                    <h2 className="text-xl font-bold mb-4">Stops ({stops.length})</h2>
                    <div className="space-y-3">
                      {stops.length === 0 ? <p className="text-slate-500 text-center py-8">No stops yet. Create a stop, then attach it to a route segment.</p> : stops.map(stop => <div key={stop.stop_id} className="p-4 bg-slate-800 border border-slate-700 rounded-lg"><h3 className="font-semibold text-white">{stop.stop_name}</h3><p className="text-sm text-slate-400 mt-1">Lat: {stop.latitude} | Lng: {stop.longitude}</p></div>)}
                    </div>
                  </div>
                </div>
              )}

              {/* EMPLOYEES */}
              {activeTab === 'employees' && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                    <h2 className="text-xl font-bold mb-4">Add Employee Account</h2>
                    <div className="space-y-4">
                      <input type="text" placeholder="Full Name *" value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 outline-none transition focus:border-sky-500" />
                      <input type="email" placeholder="Email *" value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 outline-none transition focus:border-sky-500" />
                      <input type="tel" placeholder="Phone *" value={empForm.phone_num} onChange={(e) => setEmpForm({ ...empForm, phone_num: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 outline-none transition focus:border-sky-500" />
                      <input type="password" placeholder="Password *" value={empForm.password} onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 outline-none transition focus:border-sky-500" />
                      <select value={empForm.role} onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none transition focus:border-sky-500">
                        <option value="driver">Driver</option>
                        <option value="conductor">Conductor</option>
                      </select>
                      <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-white font-semibold transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50" onClick={handleCreateEmployee} disabled={creatingEmp}>
                        {creatingEmp ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
                        Create Account
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                    <h2 className="text-xl font-bold mb-4">Drivers ({drivers.length})</h2>
                    <div className="space-y-3">
                      {drivers.length === 0 ? <p className="text-slate-500 text-center py-8">No drivers yet. Create a driver account to allow trip assignment.</p> : drivers.map(d => <div key={d.company_user_id} className="p-4 bg-slate-800 border border-slate-700 rounded-lg"><h3 className="font-semibold text-white">{d.name}</h3><p className="text-sm text-slate-400 mt-1">{d.email}</p><p className="text-sm text-slate-400">{d.phone_num}</p></div>)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                    <h2 className="text-xl font-bold mb-4">Conductors ({conductors.length})</h2>
                    <div className="space-y-3">
                      {conductors.length === 0 ? <p className="text-slate-500 text-center py-8">No conductors yet. Create a conductor account for fare collection staffing.</p> : conductors.map(c => <div key={c.company_user_id} className="p-4 bg-slate-800 border border-slate-700 rounded-lg"><h3 className="font-semibold text-white">{c.name}</h3><p className="text-sm text-slate-400 mt-1">{c.email}</p><p className="text-sm text-slate-400">{c.phone_num}</p></div>)}
                    </div>
                  </div>
                </div>
              )}

              {/* TRIPS */}
              {activeTab === 'trips' && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                    <h2 className="text-xl font-bold mb-4">Schedule New Trip</h2>
                    <div className="space-y-4">
                      <select value={tripForm.fleet_route_id} onChange={(e) => setTripForm({ ...tripForm, fleet_route_id: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none transition focus:border-sky-500">
                        <option value="">Select fleet route *</option>
                        {fleetRouteOptions.map((fr) => (
                          <option key={fr.fleet_route_id} value={fr.fleet_route_id}>
                            {fr.route?.route_name || `Route ${fr.route_id}`} ({fr.fleet?.plate_number || `Fleet ${fr.fleet_id}`})
                          </option>
                        ))}
                      </select>
                      <input type="date" value={tripForm.trip_date} onChange={(e) => setTripForm({ ...tripForm, trip_date: e.target.value })} min={new Date().toISOString().split('T')[0]} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none transition focus:border-sky-500" />
                      <select value={tripForm.driver_id} onChange={(e) => setTripForm({ ...tripForm, driver_id: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none transition focus:border-sky-500">
                        <option value="">Select driver *</option>
                        {drivers.map(d => <option key={d.company_user_id} value={d.company_user_id}>{d.name}</option>)}
                      </select>
                      <select value={tripForm.conductor_id} onChange={(e) => setTripForm({ ...tripForm, conductor_id: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none transition focus:border-sky-500">
                        <option value="">Select conductor *</option>
                        {conductors.map(c => <option key={c.company_user_id} value={c.company_user_id}>{c.name}</option>)}
                      </select>
                      <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-white font-semibold transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50" onClick={handleScheduleTrip} disabled={creatingTrip}>
                        {creatingTrip ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
                        Schedule Trip
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                    <h2 className="text-xl font-bold mb-4">Upcoming Trips ({trips.length})</h2>
                    <div className="space-y-3">
                      {trips.length === 0 ? <p className="text-slate-500 text-center py-8">No trips scheduled. Pick a fleet route, date, and crew to publish the first trip.</p> : trips.map(trip => <div key={trip.trip_id} className="p-4 bg-slate-800 border border-slate-700 rounded-lg"><h3 className="font-semibold text-white">{formatTripSchedule(trip)} • {trip.fleet_route?.route?.route_name || `Route ${trip.fleet_route?.route_id || '-'}`}</h3><p className="text-sm text-slate-400 mt-1">Fleet: {trip.fleet_route?.fleet?.plate_number || `Fleet ${trip.fleet_route?.fleet_id || '-'}`}</p><p className="text-sm text-slate-400">Status: {trip.status}</p></div>)}
                    </div>
                  </div>
                </div>
              )}

              {/* REPORTS */}
              {activeTab === 'reports' && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                    <h2 className="text-xl font-bold mb-4">Advanced Report Filters</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs uppercase text-slate-500 mb-2">Start Date</label>
                        <input
                          type="date"
                          value={reportRange.start_date}
                          onChange={(e) => setReportRange(prev => ({ ...prev, start_date: e.target.value }))}
                          max={reportDateMax}
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none transition focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase text-slate-500 mb-2">End Date</label>
                        <input
                          type="date"
                          value={reportRange.end_date}
                          onChange={(e) => setReportRange(prev => ({ ...prev, end_date: e.target.value, date: e.target.value }))}
                          max={reportDateMax}
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none transition focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase text-slate-500 mb-2">Fleet</label>
                        <select
                          value={selectedFleet}
                          onChange={(e) => setSelectedFleet(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none transition focus:border-sky-500"
                        >
                          <option value="">Choose a fleet</option>
                          {fleets.map((f) => <option key={f.fleet_id} value={f.fleet_id}>{f.plate_number}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {REPORT_ACTIONS.map((action) => {
                      const Icon = action.icon;
                      const isActive = reportType === action.id;
                      return (
                        <button
                          key={action.id}
                          onClick={() => loadAdvancedReport(action.id)}
                          disabled={loadingReport}
                          className={[
                            'group relative overflow-hidden rounded-xl border bg-slate-900 p-4 text-left transition',
                            isActive
                              ? 'border-sky-500 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]'
                              : 'border-slate-700 hover:border-slate-500',
                          ].join(' ')}
                        >
                          <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-sky-500 via-cyan-400 to-transparent" aria-hidden="true" />
                          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950">
                            <Icon className={`h-5 w-5 ${action.color}`} />
                          </div>
                          <div className="font-semibold text-slate-100">{action.label}</div>
                          <div className="mt-1 text-xs text-slate-500">Generate and render this report in table/cards below.</div>
                        </button>
                      );
                    })}
                  </div>

                  {Object.keys(advancedReports).length > 0 && (
                    <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h2 className="mb-1 text-xl font-bold">{reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</h2>
                          <p className="text-sm text-slate-500">Latest generated payload for this metric group.</p>
                        </div>
                        <button
                          type="button"
                          onClick={printReportsPdf}
                          className="rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-400"
                        >
                          Print PDF
                        </button>
                      </div>
                      {renderReportBody()}
                    </div>
                  )}
                </div>
              )}

              {/* TRIP MANAGEMENT */}
              {activeTab === 'trip-mgmt' && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                    <h2 className="text-xl font-bold mb-3">Trip Management</h2>
                    <p className="text-sm text-slate-400">Use the Schedule Trips tab to create trips and assign crews. Use Advanced Reports for analytics.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6">
                    <h3 className="text-lg font-semibold mb-3">Recent Trips</h3>
                    <div className="space-y-3">
                      {trips.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No trips available.</p>
                      ) : (
                        trips.slice(0, 8).map((item) => (
                          <div key={item.trip_id} className="rounded-lg border border-slate-700 bg-slate-800 p-3">
                            <div className="font-semibold text-white">Trip #{item.trip_id} • {item.fleet_route?.route?.route_name || `Route ${item.fleet_route?.route_id || '-'}`}</div>
                            <div className="mt-1 text-sm text-slate-400">Schedule: {formatTripSchedule(item)} • Status: {item.status}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

