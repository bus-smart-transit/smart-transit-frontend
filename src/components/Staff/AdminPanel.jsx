import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StaffService from '../../api/StaffService/StaffService';
import { Plus, Edit, Trash2, AlertCircle, CheckCircle, Loader } from 'lucide-react';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('stops');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Stops
  const [stops, setStops] = useState([]);
  const [stopForm, setStopForm] = useState({ stop_name: '', location: '', latitude: '', longitude: '' });
  const [editingStopId, setEditingStopId] = useState(null);

  // Routes
  const [routes, setRoutes] = useState([]);
  const [routeForm, setRouteForm] = useState({ route_name: '', origin: '', destination: '' });
  const [editingRouteId, setEditingRouteId] = useState(null);

  // Fleets
  const [fleets, setFleets] = useState([]);
  const [fleetForm, setFleetForm] = useState({ plate_number: '', seated_capacity: '', standing_capacity: '', fleet_type: 'public' });
  const [editingFleetId, setEditingFleetId] = useState(null);

  // Accounts
  const [allDrivers, setAllDrivers] = useState([]);
  const [allConductors, setAllConductors] = useState([]);
  const [accountForm, setAccountForm] = useState({ name: '', email: '', password: '', phone_num: '', role: 'driver' });

  const showMessage = (msg, isSuccess) => {
    if (isSuccess) setSuccess(msg);
    else setError(msg);
    setTimeout(() => { setSuccess(''); setError(''); }, 3000);
  };

  // ──── STOPS ────
  const loadStops = async () => {
    setLoading(true);
    try {
      const res = await StaffService.getStops();
      setStops(res?.data ?? []);
    } catch (err) {
      showMessage(err.message || 'Failed to load stops', false);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStop = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingStopId) {
        await StaffService.updateStop(editingStopId, stopForm);
        setStops(stops.map(s => s.stop_id === editingStopId ? { ...s, ...stopForm } : s));
        showMessage('Stop updated successfully!', true);
        setEditingStopId(null);
      } else {
        const res = await StaffService.createStop(stopForm);
        setStops([...stops, res.data]);
        showMessage('Stop created successfully!', true);
      }
      setStopForm({ stop_name: '', location: '', latitude: '', longitude: '' });
    } catch (err) {
      showMessage(err.message || 'Failed to save stop', false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStop = async (stopId) => {
    if (!window.confirm('Delete this stop?')) return;
    try {
      await StaffService.deleteStop(stopId);
      setStops(stops.filter(s => s.stop_id !== stopId));
      showMessage('Stop deleted successfully!', true);
    } catch (err) {
      showMessage(err.message || 'Failed to delete stop', false);
    }
  };

  // ──── ROUTES ────
  const loadRoutes = async () => {
    setLoading(true);
    try {
      const res = await StaffService.getRoutes();
      setRoutes(res?.data ?? []);
    } catch (err) {
      showMessage(err.message || 'Failed to load routes', false);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoute = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingRouteId) {
        await StaffService.updateRoute(editingRouteId, routeForm);
        setRoutes(routes.map(r => r.route_id === editingRouteId ? { ...r, ...routeForm } : r));
        showMessage('Route updated successfully!', true);
        setEditingRouteId(null);
      } else {
        const res = await StaffService.createRoute(routeForm);
        setRoutes([...routes, res.data]);
        showMessage('Route created successfully!', true);
      }
      setRouteForm({ route_name: '', origin: '', destination: '' });
    } catch (err) {
      showMessage(err.message || 'Failed to save route', false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoute = async (routeId) => {
    if (!window.confirm('Delete this route?')) return;
    try {
      await StaffService.deleteRoute(routeId);
      setRoutes(routes.filter(r => r.route_id !== routeId));
      showMessage('Route deleted successfully!', true);
    } catch (err) {
      showMessage(err.message || 'Failed to delete route', false);
    }
  };

  // ──── FLEETS ────
  const loadFleets = async () => {
    setLoading(true);
    try {
      const res = await StaffService.getAdminFleets();
      setFleets(res?.data ?? []);
    } catch (err) {
      showMessage(err.message || 'Failed to load fleets', false);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFleet = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingFleetId) {
        await StaffService.updateFleet(editingFleetId, {
          plate_number: fleetForm.plate_number,
          seated_capacity: parseInt(fleetForm.seated_capacity),
          standing_capacity: parseInt(fleetForm.standing_capacity),
          fleet_type: fleetForm.fleet_type,
        });
        setFleets(fleets.map(f => f.fleet_id === editingFleetId ? { ...f, ...fleetForm } : f));
        showMessage('Fleet updated successfully!', true);
        setEditingFleetId(null);
      } else {
        const res = await StaffService.adminCreateFleet({
          plate_number: fleetForm.plate_number,
          seated_capacity: parseInt(fleetForm.seated_capacity),
          standing_capacity: parseInt(fleetForm.standing_capacity),
          fleet_type: fleetForm.fleet_type,
        });
        setFleets([...fleets, res.data]);
        showMessage('Fleet created successfully!', true);
      }
      setFleetForm({ plate_number: '', seated_capacity: '', standing_capacity: '', fleet_type: 'public' });
    } catch (err) {
      showMessage(err.message || 'Failed to save fleet', false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFleet = async (fleetId) => {
    if (!window.confirm('Delete this fleet?')) return;
    try {
      await StaffService.deleteFleet(fleetId);
      setFleets(fleets.filter(f => f.fleet_id !== fleetId));
      showMessage('Fleet deleted successfully!', true);
    } catch (err) {
      showMessage(err.message || 'Failed to delete fleet', false);
    }
  };

  // ──── ACCOUNTS ────
  const loadAccounts = async () => {
    setLoading(true);
    try {
      const [drivers, conductors] = await Promise.all([
        StaffService.getAdminDrivers(),
        StaffService.getAdminConductors(),
      ]);
      setAllDrivers(drivers?.data ?? []);
      setAllConductors(conductors?.data ?? []);
    } catch (err) {
      showMessage(err.message || 'Failed to load accounts', false);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await StaffService.createAdminAccount(accountForm);
      showMessage('Account created successfully!', true);
      setAccountForm({ name: '', email: '', password: '', phone_num: '', role: 'driver' });
      loadAccounts();
    } catch (err) {
      showMessage(err.message || 'Failed to create account', false);
    } finally {
      setLoading(false);
    }
  };

  // ──── EFFECTS ────
  useEffect(() => {
    if (activeTab === 'stops') loadStops();
    else if (activeTab === 'routes') loadRoutes();
    else if (activeTab === 'fleets') loadFleets();
    else if (activeTab === 'accounts') loadAccounts();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900 p-6">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-slate-400">Manage all system resources: stops, routes, fleets, and accounts</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-6 mt-4 flex items-center gap-3 rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-red-300">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mx-6 mt-4 flex items-center gap-3 rounded-lg border border-green-900/50 bg-green-950/30 p-4 text-green-300">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-6">
        <div className="flex gap-8">
          {['stops', 'routes', 'fleets', 'accounts'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-2 font-semibold border-b-2 transition capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-300'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {activeTab === 'stops' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Form */}
            <form onSubmit={handleAddStop} className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 lg:col-span-1">
              <h2 className="mb-4 text-lg font-semibold">{editingStopId ? 'Edit Stop' : 'Add Stop'}</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Stop Name"
                  value={stopForm.stop_name}
                  onChange={e => setStopForm({ ...stopForm, stop_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={stopForm.location}
                  onChange={e => setStopForm({ ...stopForm, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
                <input
                  type="number"
                  placeholder="Latitude"
                  value={stopForm.latitude}
                  onChange={e => setStopForm({ ...stopForm, latitude: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  step="0.0001"
                />
                <input
                  type="number"
                  placeholder="Longitude"
                  value={stopForm.longitude}
                  onChange={e => setStopForm({ ...stopForm, longitude: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  step="0.0001"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-semibold flex items-center justify-center gap-2">
                    {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {editingStopId ? 'Update' : 'Add'}
                  </button>
                  {editingStopId && (
                    <button type="button" onClick={() => { setEditingStopId(null); setStopForm({ stop_name: '', location: '', latitude: '', longitude: '' }); }} className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>

            {/* List */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 lg:col-span-2">
              <h2 className="mb-4 text-lg font-semibold">Stops</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stops.length === 0 ? (
                  <p className="text-slate-400">No stops yet</p>
                ) : (
                  stops.map(stop => (
                    <div key={stop.stop_id} className="flex items-center justify-between p-3 rounded-lg border border-slate-700 hover:border-slate-600">
                      <div className="flex-1">
                        <p className="font-semibold text-white">{stop.stop_name}</p>
                        <p className="text-sm text-slate-400">{stop.location}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingStopId(stop.stop_id); setStopForm(stop); }} className="p-2 hover:bg-slate-700 rounded-lg transition">
                          <Edit className="h-4 w-4 text-blue-400" />
                        </button>
                        <button onClick={() => handleDeleteStop(stop.stop_id)} className="p-2 hover:bg-slate-700 rounded-lg transition">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'routes' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <form onSubmit={handleAddRoute} className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 lg:col-span-1">
              <h2 className="mb-4 text-lg font-semibold">{editingRouteId ? 'Edit Route' : 'Add Route'}</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Route Name"
                  value={routeForm.route_name}
                  onChange={e => setRouteForm({ ...routeForm, route_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Origin"
                  value={routeForm.origin}
                  onChange={e => setRouteForm({ ...routeForm, origin: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
                <input
                  type="text"
                  placeholder="Destination"
                  value={routeForm.destination}
                  onChange={e => setRouteForm({ ...routeForm, destination: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-semibold flex items-center justify-center gap-2">
                    {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {editingRouteId ? 'Update' : 'Add'}
                  </button>
                  {editingRouteId && (
                    <button type="button" onClick={() => { setEditingRouteId(null); setRouteForm({ route_name: '', origin: '', destination: '' }); }} className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>

            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 lg:col-span-2">
              <h2 className="mb-4 text-lg font-semibold">Routes</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {routes.length === 0 ? (
                  <p className="text-slate-400">No routes yet</p>
                ) : (
                  routes.map(route => (
                    <div key={route.route_id} className="flex items-center justify-between p-3 rounded-lg border border-slate-700 hover:border-slate-600">
                      <div className="flex-1">
                        <p className="font-semibold text-white">{route.route_name}</p>
                        <p className="text-sm text-slate-400">{route.origin} → {route.destination}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingRouteId(route.route_id); setRouteForm(route); }} className="p-2 hover:bg-slate-700 rounded-lg transition">
                          <Edit className="h-4 w-4 text-blue-400" />
                        </button>
                        <button onClick={() => handleDeleteRoute(route.route_id)} className="p-2 hover:bg-slate-700 rounded-lg transition">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fleets' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <form onSubmit={handleAddFleet} className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 lg:col-span-1">
              <h2 className="mb-4 text-lg font-semibold">{editingFleetId ? 'Edit Fleet' : 'Add Fleet'}</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Plate Number"
                  value={fleetForm.plate_number}
                  onChange={e => setFleetForm({ ...fleetForm, plate_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  required
                />
                <input
                  type="number"
                  placeholder="Seated Capacity"
                  value={fleetForm.seated_capacity}
                  onChange={e => setFleetForm({ ...fleetForm, seated_capacity: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  required
                />
                <input
                  type="number"
                  placeholder="Standing Capacity"
                  value={fleetForm.standing_capacity}
                  onChange={e => setFleetForm({ ...fleetForm, standing_capacity: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  required
                />
                <select
                  value={fleetForm.fleet_type}
                  onChange={e => setFleetForm({ ...fleetForm, fleet_type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-semibold flex items-center justify-center gap-2">
                    {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {editingFleetId ? 'Update' : 'Add'}
                  </button>
                  {editingFleetId && (
                    <button type="button" onClick={() => { setEditingFleetId(null); setFleetForm({ plate_number: '', seated_capacity: '', standing_capacity: '', fleet_type: 'public' }); }} className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>

            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 lg:col-span-2">
              <h2 className="mb-4 text-lg font-semibold">Fleets</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {fleets.length === 0 ? (
                  <p className="text-slate-400">No fleets yet</p>
                ) : (
                  fleets.map(fleet => (
                    <div key={fleet.fleet_id} className="flex items-center justify-between p-3 rounded-lg border border-slate-700 hover:border-slate-600">
                      <div className="flex-1">
                        <p className="font-semibold text-white">{fleet.plate_number}</p>
                        <p className="text-sm text-slate-400">{fleet.seated_capacity} seated + {fleet.standing_capacity} standing = {fleet.capacity} total</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingFleetId(fleet.fleet_id); setFleetForm(fleet); }} className="p-2 hover:bg-slate-700 rounded-lg transition">
                          <Edit className="h-4 w-4 text-blue-400" />
                        </button>
                        <button onClick={() => handleDeleteFleet(fleet.fleet_id)} className="p-2 hover:bg-slate-700 rounded-lg transition">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <form onSubmit={handleCreateAccount} className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 lg:col-span-1">
              <h2 className="mb-4 text-lg font-semibold">Create Account</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={accountForm.name}
                  onChange={e => setAccountForm({ ...accountForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={accountForm.email}
                  onChange={e => setAccountForm({ ...accountForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={accountForm.password}
                  onChange={e => setAccountForm({ ...accountForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={accountForm.phone_num}
                  onChange={e => setAccountForm({ ...accountForm, phone_num: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  required
                />
                <select
                  value={accountForm.role}
                  onChange={e => setAccountForm({ ...accountForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="driver">Driver</option>
                  <option value="conductor">Conductor</option>
                </select>
                <button type="submit" disabled={loading} className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-semibold flex items-center justify-center gap-2">
                  {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Account
                </button>
              </div>
            </form>

            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 lg:col-span-2">
              <h2 className="mb-4 text-lg font-semibold">Drivers ({allDrivers.length})</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-6">
                {allDrivers.length === 0 ? (
                  <p className="text-slate-400">No drivers yet</p>
                ) : (
                  allDrivers.map(driver => (
                    <div key={driver.company_user_id} className="p-3 rounded-lg border border-slate-700">
                      <p className="font-semibold text-white">{driver.name}</p>
                      <p className="text-sm text-slate-400">{driver.email}</p>
                    </div>
                  ))
                )}
              </div>

              <h2 className="mb-4 text-lg font-semibold">Conductors ({allConductors.length})</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allConductors.length === 0 ? (
                  <p className="text-slate-400">No conductors yet</p>
                ) : (
                  allConductors.map(conductor => (
                    <div key={conductor.company_user_id} className="p-3 rounded-lg border border-slate-700">
                      <p className="font-semibold text-white">{conductor.name}</p>
                      <p className="text-sm text-slate-400">{conductor.email}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
