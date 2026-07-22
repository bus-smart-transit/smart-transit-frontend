import { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import StaffService from '../../api/StaffService/StaffService';
import { Plus, Loader, AlertCircle, CheckCircle, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'fleets', label: 'Fleet Management', icon: '🚌' },
  { id: 'employees', label: 'Employees', icon: '👥' },
  { id: 'trips', label: 'Schedule Trips', icon: '📅' },
  { id: 'trip-mgmt', label: 'Trip Management', icon: '🎯' },
  { id: 'reports', label: 'Advanced Reports', icon: '📈' },
];

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const didBootstrap = useRef(false);
  const reportDateMax = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
  const [fareRuleForm, setFareRuleForm] = useState({ fleet_id: '', seat_type: 'seated', base_fare: '', fare_per_km: '' });
  const [stopForm, setStopForm] = useState({ stop_name: '', latitude: '', longitude: '' });
  const [routeStopForm, setRouteStopForm] = useState({ route_id: '', stop_id: '', stop_order: '', distance_from_origin_km: '' });
  const [assigningRoute, setAssigningRoute] = useState(false);
  const [creatingFareRule, setCreatingFareRule] = useState(false);
  const [creatingStop, setCreatingStop] = useState(false);
  const [addingStopToRoute, setAddingStopToRoute] = useState(false);

  const [selectedFleet, setSelectedFleet] = useState('');
  const [financialData, setFinancialData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportType, setReportType] = useState('financial');
  const [advancedReports, setAdvancedReports] = useState({});
  const [tripManagementList, setTripManagementList] = useState([]);
  const [assigningTrip, setAssigningTrip] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedConductor, setSelectedConductor] = useState('');
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

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const profileRes = await StaffService.getProfile('operator');
      setProfile(profileRes.data);

      const fleetsRes = await StaffService.getOperatorFleets();
      setFleets(fleetsRes.data || []);

      const driversRes = await StaffService.getOperatorDrivers();
      setDrivers(driversRes.data || []);

      const conductorsRes = await StaffService.getOperatorConductors();
      setConductors(conductorsRes.data || []);

      const routesRes = await StaffService.getOperatorRoutes();
      setRoutes(routesRes.data || []);

      const stopsRes = await StaffService.getOperatorStops();
      setStops(stopsRes.data || []);

      const fleetRoutesRes = await StaffService.getOperatorFleetRoutes();
      const assignedFleetRoutes = fleetRoutesRes?.data || [];
      setFleetRouteOptions(assignedFleetRoutes);

      const upcomingTripsRes = await StaffService.getOperatorTrips();
      const upcomingTrips = upcomingTripsRes?.data || [];
      setTrips(upcomingTrips);
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
      showMessage('Stop created successfully!', true);
    } catch (err) {
      showMessage(err?.message || 'Failed to create stop', false);
    } finally {
      setCreatingStop(false);
    }
  };

  const handleAddStopToRoute = async () => {
    if (!routeStopForm.route_id || !routeStopForm.stop_id || !routeStopForm.stop_order || !routeStopForm.distance_from_origin_km) {
      showMessage('Please complete route-stop fields', false);
      return;
    }

    setAddingStopToRoute(true);
    try {
      await StaffService.addOperatorStopToRoute(parseInt(routeStopForm.route_id), {
        stop_id: parseInt(routeStopForm.stop_id),
        stop_order: parseInt(routeStopForm.stop_order),
        distance_from_origin_km: Number(routeStopForm.distance_from_origin_km),
      });

      setRouteStopForm({ route_id: '', stop_id: '', stop_order: '', distance_from_origin_km: '' });
      showMessage('Stop applied to route successfully (saved in route_stop).', true);
    } catch (err) {
      showMessage(err?.message || 'Failed to apply stop to route', false);
    } finally {
      setAddingStopToRoute(false);
    }
  };

  const loadFinancialReport = async () => {
    if (!selectedFleet) {
      showMessage('Please select a fleet', false);
      return;
    }

    setLoadingReport(true);
    try {
      const res = await StaffService.getFinancialReport(selectedFleet, {
        start_date: reportRange.start_date,
        end_date: reportRange.end_date,
      });
      setFinancialData(res.data);
      showMessage('Report loaded successfully', true);
    } catch (err) {
      showMessage(err?.message || 'Failed to load financial report', false);
    } finally {
      setLoadingReport(false);
    }
  };

  const loadTripManagement = useCallback(async () => {
    try {
      const res = await StaffService.getOperatorTrips();
      setTripManagementList(res.data || []);
    } catch (err) {
      showMessage('Failed to load trips', false);
    }
  }, []);

  const handleAssignDriver = async (tripId, driverId) => {
    try {
      await StaffService.assignDriver(tripId, driverId);
      showMessage('Driver assigned successfully!', true);
      loadTripManagement();
    } catch (err) {
      showMessage(err?.message || 'Failed to assign driver', false);
    }
  };

  const handleAssignConductor = async (tripId, conductorId) => {
    try {
      await StaffService.assignConductor(tripId, conductorId);
      showMessage('Conductor assigned successfully!', true);
      loadTripManagement();
    } catch (err) {
      showMessage(err?.message || 'Failed to assign conductor', false);
    }
  };

  const handleUpdateTripStatus = async (tripId, action) => {
    try {
      if (action === 'boarding') await StaffService.startBoarding(tripId);
      else if (action === 'depart') await StaffService.operatorDepartTrip(tripId);
      else if (action === 'complete') await StaffService.operatorCompleteTrip(tripId);
      
      showMessage(`Trip status updated to ${action}!`, true);
      loadTripManagement();
    } catch (err) {
      showMessage(err?.message || `Failed to update trip status`, false);
    }
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
      
      setAdvancedReports({ ...advancedReports, [type]: res.data });
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

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-200">
      {/* Sidebar */}
      <aside className="w-80 bg-slate-950 border-r border-slate-700 p-6 flex flex-col overflow-y-auto">
        <div className="mb-8">
          <div className="text-2xl font-bold text-blue-400 mb-2">🚌 Smart Transit</div>
          <div className="text-xs uppercase tracking-wider text-slate-500">Operator</div>
        </div>

        {profile && (
          <div className="flex gap-3 p-4 bg-slate-900 rounded-lg mb-8">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
              {(profile.name || 'O')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white truncate">{profile.name}</div>
              <div className="text-xs text-slate-400 truncate">{profile.email}</div>
            </div>
          </div>
        )}

        <nav className="flex-1 flex flex-col gap-1 mb-8">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                activeTab === item.id
                  ? 'bg-blue-500/20 text-blue-400 border-l-4 border-blue-500 pl-3'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              onClick={() => {
                setActiveTab(item.id);
                setError('');
                setSuccessMsg('');
              }}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
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
            🔄 Refresh
          </button>
        </div>

        {error && (
          <div className="mx-8 mt-6 flex items-center gap-3 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-red-300">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-8 mt-6 flex items-center gap-3 rounded-lg border border-green-900/50 bg-green-950/30 px-4 py-3 text-green-300">
            <CheckCircle size={18} className="flex-shrink-0" />
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
                    <div className="text-4xl">🚌</div>
                    <div className="flex-1">
                      <div className="text-xs uppercase text-slate-500 mb-1">Active Fleets</div>
                      <div className="text-3xl font-bold text-blue-400">{fleets.length}</div>
                    </div>
                  </div>
                  <div className="flex gap-4 p-6 bg-slate-900 border border-slate-700 rounded-lg hover:border-slate-600 transition">
                    <div className="text-4xl">👨‍✈️</div>
                    <div className="flex-1">
                      <div className="text-xs uppercase text-slate-500 mb-1">Drivers</div>
                      <div className="text-3xl font-bold text-blue-400">{drivers.length}</div>
                    </div>
                  </div>
                  <div className="flex gap-4 p-6 bg-slate-900 border border-slate-700 rounded-lg hover:border-slate-600 transition">
                    <div className="text-4xl">👔</div>
                    <div className="flex-1">
                      <div className="text-xs uppercase text-slate-500 mb-1">Conductors</div>
                      <div className="text-3xl font-bold text-blue-400">{conductors.length}</div>
                    </div>
                  </div>
                  <div className="flex gap-4 p-6 bg-slate-900 border border-slate-700 rounded-lg hover:border-slate-600 transition">
                    <div className="text-4xl">📅</div>
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
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Add New Fleet</h2>
                    <div className="space-y-4">
                      <input type="text" placeholder="Plate Number *" value={fleetForm.plate_number} onChange={(e) => setFleetForm({ ...fleetForm, plate_number: e.target.value })} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                      <select value={fleetForm.fleet_type} onChange={(e) => setFleetForm({ ...fleetForm, fleet_type: e.target.value })} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none">
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                      <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Seated Capacity *" value={fleetForm.seated_capacity} onChange={(e) => setFleetForm({ ...fleetForm, seated_capacity: e.target.value })} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                        <input type="number" placeholder="Standing Capacity *" value={fleetForm.standing_capacity} onChange={(e) => setFleetForm({ ...fleetForm, standing_capacity: e.target.value })} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                      </div>
                      <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2" onClick={handleAddFleet} disabled={addingFleet}>
                        {addingFleet ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
                        Add Fleet
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Your Fleets ({fleets.length})</h2>
                    <div className="space-y-3">
                      {fleets.length === 0 ? <p className="text-slate-500 text-center py-8">No fleets yet</p> : fleets.map(fleet => <div key={fleet.fleet_id} className="p-4 bg-slate-800 border border-slate-700 rounded-lg"><h3 className="font-semibold text-white">{fleet.plate_number}</h3><p className="text-sm text-slate-400 mt-1">Type: {fleet.fleet_type}</p><p className="text-sm text-slate-400">Seated: {fleet.seated_capacity} | Standing: {fleet.standing_capacity}</p></div>)}
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Assign Route To Fleet</h2>
                    <div className="space-y-4">
                      <select
                        value={routeAssignForm.fleet_id}
                        onChange={(e) => setRouteAssignForm({ ...routeAssignForm, fleet_id: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Select fleet *</option>
                        {fleets.map((fleet) => (
                          <option key={fleet.fleet_id} value={fleet.fleet_id}>{fleet.plate_number}</option>
                        ))}
                      </select>
                      <select
                        value={routeAssignForm.route_id}
                        onChange={(e) => setRouteAssignForm({ ...routeAssignForm, route_id: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
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
                          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        />
                        <input
                          type="time"
                          value={routeAssignForm.end_time}
                          onChange={(e) => setRouteAssignForm({ ...routeAssignForm, end_time: e.target.value })}
                          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <button
                        className="w-full px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                        onClick={handleAssignRouteToFleet}
                        disabled={assigningRoute}
                      >
                        {assigningRoute ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
                        Assign Route
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Create Fare Rule</h2>
                    <div className="space-y-4">
                      <select
                        value={fareRuleForm.fleet_id}
                        onChange={(e) => setFareRuleForm({ ...fareRuleForm, fleet_id: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Select fleet *</option>
                        {fleets.map((fleet) => (
                          <option key={fleet.fleet_id} value={fleet.fleet_id}>{fleet.plate_number}</option>
                        ))}
                      </select>
                      <select
                        value={fareRuleForm.seat_type}
                        onChange={(e) => setFareRuleForm({ ...fareRuleForm, seat_type: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
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
                          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Fare Per KM *"
                          value={fareRuleForm.fare_per_km}
                          onChange={(e) => setFareRuleForm({ ...fareRuleForm, fare_per_km: e.target.value })}
                          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <button
                        className="w-full px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                        onClick={handleCreateFareRule}
                        disabled={creatingFareRule}
                      >
                        {creatingFareRule ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
                        Create Fare Rule
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Create Stop</h2>
                    <div className="space-y-4">
                      <input
                        type="text"
                        placeholder="Stop Name *"
                        value={stopForm.stop_name}
                        onChange={(e) => setStopForm({ ...stopForm, stop_name: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="number"
                          step="0.000001"
                          placeholder="Latitude *"
                          value={stopForm.latitude}
                          onChange={(e) => setStopForm({ ...stopForm, latitude: e.target.value })}
                          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                        <input
                          type="number"
                          step="0.000001"
                          placeholder="Longitude *"
                          value={stopForm.longitude}
                          onChange={(e) => setStopForm({ ...stopForm, longitude: e.target.value })}
                          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <button
                        className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                        onClick={handleCreateStop}
                        disabled={creatingStop}
                      >
                        {creatingStop ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
                        Create Stop
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Apply Stop To Route</h2>
                    <div className="space-y-4">
                      <select
                        value={routeStopForm.route_id}
                        onChange={(e) => setRouteStopForm({ ...routeStopForm, route_id: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Select route *</option>
                        {routes.map((route) => (
                          <option key={route.route_id} value={route.route_id}>{route.route_name || `Route ${route.route_id}`}</option>
                        ))}
                      </select>
                      <select
                        value={routeStopForm.stop_id}
                        onChange={(e) => setRouteStopForm({ ...routeStopForm, stop_id: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Select stop *</option>
                        {stops.map((stop) => (
                          <option key={stop.stop_id} value={stop.stop_id}>{stop.stop_name}</option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="number"
                          min="1"
                          placeholder="Stop Order *"
                          value={routeStopForm.stop_order}
                          onChange={(e) => setRouteStopForm({ ...routeStopForm, stop_order: e.target.value })}
                          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Distance from Origin (km) *"
                          value={routeStopForm.distance_from_origin_km}
                          onChange={(e) => setRouteStopForm({ ...routeStopForm, distance_from_origin_km: e.target.value })}
                          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <button
                        className="w-full px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                        onClick={handleAddStopToRoute}
                        disabled={addingStopToRoute}
                      >
                        {addingStopToRoute ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
                        Apply Stop To Route
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Stops ({stops.length})</h2>
                    <div className="space-y-3">
                      {stops.length === 0 ? <p className="text-slate-500 text-center py-8">No stops yet</p> : stops.map(stop => <div key={stop.stop_id} className="p-4 bg-slate-800 border border-slate-700 rounded-lg"><h3 className="font-semibold text-white">{stop.stop_name}</h3><p className="text-sm text-slate-400 mt-1">Lat: {stop.latitude} | Lng: {stop.longitude}</p></div>)}
                    </div>
                  </div>
                </div>
              )}

              {/* EMPLOYEES */}
              {activeTab === 'employees' && (
                <div className="space-y-6">
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Add Employee Account</h2>
                    <div className="space-y-4">
                      <input type="text" placeholder="Full Name *" value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                      <input type="email" placeholder="Email *" value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                      <input type="tel" placeholder="Phone *" value={empForm.phone_num} onChange={(e) => setEmpForm({ ...empForm, phone_num: e.target.value })} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                      <input type="password" placeholder="Password *" value={empForm.password} onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
                      <select value={empForm.role} onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none">
                        <option value="driver">Driver</option>
                        <option value="conductor">Conductor</option>
                      </select>
                      <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2" onClick={handleCreateEmployee} disabled={creatingEmp}>
                        {creatingEmp ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
                        Create Account
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Drivers ({drivers.length})</h2>
                    <div className="space-y-3">
                      {drivers.length === 0 ? <p className="text-slate-500 text-center py-8">No drivers yet</p> : drivers.map(d => <div key={d.company_user_id} className="p-4 bg-slate-800 border border-slate-700 rounded-lg"><h3 className="font-semibold text-white">{d.name}</h3><p className="text-sm text-slate-400 mt-1">{d.email}</p><p className="text-sm text-slate-400">{d.phone_num}</p></div>)}
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Conductors ({conductors.length})</h2>
                    <div className="space-y-3">
                      {conductors.length === 0 ? <p className="text-slate-500 text-center py-8">No conductors yet</p> : conductors.map(c => <div key={c.company_user_id} className="p-4 bg-slate-800 border border-slate-700 rounded-lg"><h3 className="font-semibold text-white">{c.name}</h3><p className="text-sm text-slate-400 mt-1">{c.email}</p><p className="text-sm text-slate-400">{c.phone_num}</p></div>)}
                    </div>
                  </div>
                </div>
              )}

              {/* TRIPS */}
              {activeTab === 'trips' && (
                <div className="space-y-6">
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Schedule New Trip</h2>
                    <div className="space-y-4">
                      <select value={tripForm.fleet_route_id} onChange={(e) => setTripForm({ ...tripForm, fleet_route_id: e.target.value })} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none">
                        <option value="">Select fleet route *</option>
                        {fleetRouteOptions.map((fr) => (
                          <option key={fr.fleet_route_id} value={fr.fleet_route_id}>
                            {fr.route?.route_name || `Route ${fr.route_id}`} ({fr.fleet?.plate_number || `Fleet ${fr.fleet_id}`})
                          </option>
                        ))}
                      </select>
                      <input type="date" value={tripForm.trip_date} onChange={(e) => setTripForm({ ...tripForm, trip_date: e.target.value })} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none" />
                      <select value={tripForm.driver_id} onChange={(e) => setTripForm({ ...tripForm, driver_id: e.target.value })} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none">
                        <option value="">Select driver *</option>
                        {drivers.map(d => <option key={d.company_user_id} value={d.company_user_id}>{d.name}</option>)}
                      </select>
                      <select value={tripForm.conductor_id} onChange={(e) => setTripForm({ ...tripForm, conductor_id: e.target.value })} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none">
                        <option value="">Select conductor *</option>
                        {conductors.map(c => <option key={c.company_user_id} value={c.company_user_id}>{c.name}</option>)}
                      </select>
                      <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2" onClick={handleScheduleTrip} disabled={creatingTrip}>
                        {creatingTrip ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
                        Schedule Trip
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Upcoming Trips ({trips.length})</h2>
                    <div className="space-y-3">
                      {trips.length === 0 ? <p className="text-slate-500 text-center py-8">No trips scheduled</p> : trips.map(trip => <div key={trip.trip_id} className="p-4 bg-slate-800 border border-slate-700 rounded-lg"><h3 className="font-semibold text-white">{trip.trip_date} • {trip.fleet_route?.route?.route_name || `Route ${trip.fleet_route?.route_id || '-'}`}</h3><p className="text-sm text-slate-400 mt-1">Fleet: {trip.fleet_route?.fleet?.plate_number || `Fleet ${trip.fleet_route?.fleet_id || '-'}`}</p><p className="text-sm text-slate-400">Status: {trip.status}</p></div>)}
                    </div>
                  </div>
                </div>
              )}

              {/* REPORTS */}
              {activeTab === 'reports' && (
                <div className="space-y-6">
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Generate Financial Report</h2>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs uppercase text-slate-500 mb-2">Start Date</label>
                          <input
                            type="date"
                            value={reportRange.start_date}
                            onChange={(e) => setReportRange(prev => ({ ...prev, start_date: e.target.value }))}
                            max={reportDateMax}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs uppercase text-slate-500 mb-2">End Date</label>
                          <input
                            type="date"
                            value={reportRange.end_date}
                            onChange={(e) => setReportRange(prev => ({ ...prev, end_date: e.target.value, date: e.target.value }))}
                            max={reportDateMax}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <select value={selectedFleet} onChange={(e) => setSelectedFleet(e.target.value)} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none">
                        <option value="">Choose a fleet</option>
                        {fleets.map(f => <option key={f.fleet_id} value={f.fleet_id}>{f.plate_number}</option>)}
                      </select>
                      <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2" onClick={loadFinancialReport} disabled={loadingReport || !selectedFleet}>
                        {loadingReport ? <Loader size={18} className="animate-spin" /> : <>📊 Load Report</>}
                      </button>
                    </div>
                  </div>

                  {financialData && (
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                      <h2 className="text-xl font-bold mb-4">Financial Report</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg"><div className="text-xs uppercase text-slate-500 mb-2">Total Revenue</div><div className="text-2xl font-bold text-green-400">₱{financialData.total_revenue || '0'}</div></div>
                        <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg"><div className="text-xs uppercase text-slate-500 mb-2">Online Payments</div><div className="text-2xl font-bold text-blue-400">₱{financialData.online_payment_total || '0'}</div></div>
                        <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg"><div className="text-xs uppercase text-slate-500 mb-2">Cash Payments</div><div className="text-2xl font-bold text-amber-400">₱{financialData.cash_payment_total || '0'}</div></div>
                        <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg"><div className="text-xs uppercase text-slate-500 mb-2">Total Trips</div><div className="text-2xl font-bold text-purple-400">{financialData.total_trips || '0'}</div></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TRIP MANAGEMENT */}
              {activeTab === 'trip-mgmt' && (
                <div className="space-y-6">
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Advanced Report Filters</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs uppercase text-slate-500 mb-2">Start Date</label>
                        <input
                          type="date"
                          value={reportRange.start_date}
                          onChange={(e) => setReportRange(prev => ({ ...prev, start_date: e.target.value }))}
                          max={reportDateMax}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase text-slate-500 mb-2">End Date</label>
                        <input
                          type="date"
                          value={reportRange.end_date}
                          onChange={(e) => setReportRange(prev => ({ ...prev, end_date: e.target.value, date: e.target.value }))}
                          max={reportDateMax}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase text-slate-500 mb-2">Fleet</label>
                        <select
                          value={selectedFleet}
                          onChange={(e) => setSelectedFleet(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">Choose a fleet</option>
                          {fleets.map(f => <option key={f.fleet_id} value={f.fleet_id}>{f.plate_number}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <button onClick={() => loadAdvancedReport('financial')} className="p-4 bg-slate-900 border border-slate-700 rounded-lg hover:border-blue-500 transition">
                      <div className="text-2xl mb-2">💰</div>
                      <div className="font-semibold">Financial Report</div>
                    </button>
                    <button onClick={() => loadAdvancedReport('revenue')} className="p-4 bg-slate-900 border border-slate-700 rounded-lg hover:border-blue-500 transition">
                      <div className="text-2xl mb-2">📊</div>
                      <div className="font-semibold">Revenue by Route</div>
                    </button>
                    <button onClick={() => loadAdvancedReport('adherence')} className="p-4 bg-slate-900 border border-slate-700 rounded-lg hover:border-blue-500 transition">
                      <div className="text-2xl mb-2">✅</div>
                      <div className="font-semibold">Route Adherence</div>
                    </button>
                    <button onClick={() => loadAdvancedReport('occupancy')} className="p-4 bg-slate-900 border border-slate-700 rounded-lg hover:border-blue-500 transition">
                      <div className="text-2xl mb-2">📈</div>
                      <div className="font-semibold">Occupancy Trends</div>
                    </button>
                    <button onClick={() => loadAdvancedReport('daily')} className="p-4 bg-slate-900 border border-slate-700 rounded-lg hover:border-blue-500 transition">
                      <div className="text-2xl mb-2">📅</div>
                      <div className="font-semibold">Daily Summary</div>
                    </button>
                    <button onClick={() => loadAdvancedReport('channels')} className="p-4 bg-slate-900 border border-slate-700 rounded-lg hover:border-blue-500 transition">
                      <div className="text-2xl mb-2">💳</div>
                      <div className="font-semibold">Payment Channels</div>
                    </button>
                  </div>

                  {Object.keys(advancedReports).length > 0 && (
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
                      <h2 className="text-xl font-bold mb-4">{reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</h2>
                      <pre className="bg-slate-800 p-4 rounded-lg text-sm overflow-x-auto text-slate-300">
                        {JSON.stringify(advancedReports[reportType], null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
