import { useState, useEffect, useCallback } from 'react';
import StaffService from '../../api/StaffService/StaffService';
import { Plus, Edit, Trash2, AlertCircle, CheckCircle, Loader, ShieldCheck, MapPin, Route, Bus, Users, LogOut } from 'lucide-react';

const TAB_ITEMS = [
  { id: 'stops', label: 'Stops', icon: MapPin },
  { id: 'routes', label: 'Routes', icon: Route },
  { id: 'fleets', label: 'Fleets', icon: Bus },
  { id: 'accounts', label: 'Accounts', icon: Users },
];

export default function AdminPanel() {
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

  const showMessage = useCallback((msg, isSuccess) => {
    if (isSuccess) setSuccess(msg);
    else setError(msg);
    setTimeout(() => { setSuccess(''); setError(''); }, 3000);
  }, []);

  // ──── STOPS ────
  const loadStops = useCallback(async () => {
    setLoading(true);
    try {
      const res = await StaffService.getStops();
      setStops(res?.data ?? []);
    } catch (err) {
      showMessage(err.message || 'Failed to load stops', false);
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

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
  const loadRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await StaffService.getRoutes();
      setRoutes(res?.data ?? []);
    } catch (err) {
      showMessage(err.message || 'Failed to load routes', false);
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

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
  const loadFleets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await StaffService.getAdminFleets();
      setFleets(res?.data ?? []);
    } catch (err) {
      showMessage(err.message || 'Failed to load fleets', false);
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

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
  const loadAccounts = useCallback(async () => {
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
  }, [showMessage]);

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
    const timer = setTimeout(() => {
      if (activeTab === 'stops') loadStops();
      else if (activeTab === 'routes') loadRoutes();
      else if (activeTab === 'fleets') loadFleets();
      else if (activeTab === 'accounts') loadAccounts();
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab, loadAccounts, loadFleets, loadRoutes, loadStops]);

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-950 text-white lg:grid-cols-[280px_1fr]">
      <aside className="flex flex-col justify-between border-b border-slate-800 bg-slate-900/70 p-4 lg:border-b-0 lg:border-r">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100">
            <ShieldCheck className="h-4 w-4 text-sky-400" />
            Admin Panel
          </div>
          <p className="mb-4 text-xs text-slate-500">Manage stops, routes, fleets, and personnel records.</p>

          <nav className="relative mt-2 flex flex-col gap-1 pl-3">
            <div className="absolute bottom-2 left-1.75 top-2 w-px bg-slate-800" aria-hidden="true" />
            {TAB_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className="group relative flex items-center gap-3 rounded-lg py-2.5 pl-5 pr-3 text-sm font-medium"
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
                  <span className={isActive ? 'text-white capitalize' : 'text-slate-400 group-hover:text-slate-200 capitalize'}>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-900 bg-red-950/30 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-950/50" disabled>
          <LogOut className="h-4 w-4" />
          Admin Session
        </button>
      </aside>

      <main className="p-4 sm:p-6">
        <header className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-2xl font-bold text-slate-100">{TAB_ITEMS.find((item) => item.id === activeTab)?.label}</h1>
          <p className="mt-1 text-sm text-slate-400">Manage all system resources for dispatch operations and records.</p>
        </header>

        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-red-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-green-900/50 bg-green-950/30 p-4 text-green-300">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="max-w-7xl">
        {activeTab === 'stops' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <form onSubmit={handleAddStop} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-1">
              <div className="mb-4 border-b border-slate-800 pb-4">
                <h2 className="text-lg font-semibold text-slate-100">{editingStopId ? 'Edit Stop' : 'Add Stop'}</h2>
                <p className="mt-1 text-xs text-slate-500">Register station points for route mapping and passenger pickups.</p>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Stop Name"
                  value={stopForm.stop_name}
                  onChange={e => setStopForm({ ...stopForm, stop_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={stopForm.location}
                  onChange={e => setStopForm({ ...stopForm, location: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
                />
                <input
                  type="number"
                  placeholder="Latitude"
                  value={stopForm.latitude}
                  onChange={e => setStopForm({ ...stopForm, latitude: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
                  step="0.0001"
                />
                <input
                  type="number"
                  placeholder="Longitude"
                  value={stopForm.longitude}
                  onChange={e => setStopForm({ ...stopForm, longitude: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
                  step="0.0001"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60">
                    {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {editingStopId ? 'Update' : 'Add'}
                  </button>
                  {editingStopId && (
                    <button type="button" onClick={() => { setEditingStopId(null); setStopForm({ stop_name: '', location: '', latitude: '', longitude: '' }); }} className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-2">
              <div className="mb-4 border-b border-slate-800 pb-4">
                <h2 className="text-lg font-semibold text-slate-100">Stops</h2>
                <p className="mt-1 text-xs text-slate-500">All registered pickup and drop-off points.</p>
              </div>
              <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {stops.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-sm text-slate-400">No stops yet</p>
                ) : (
                  stops.map(stop => (
                    <div key={stop.stop_id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/70 p-3 transition hover:border-slate-500">
                      <div className="flex-1">
                        <p className="font-semibold text-white">{stop.stop_name}</p>
                        <p className="text-sm text-slate-400">{stop.location || 'No location provided'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingStopId(stop.stop_id); setStopForm(stop); }} className="rounded-lg border border-slate-700 p-2 transition hover:bg-slate-700">
                          <Edit className="h-4 w-4 text-sky-400" />
                        </button>
                        <button onClick={() => handleDeleteStop(stop.stop_id)} className="rounded-lg border border-slate-700 p-2 transition hover:bg-slate-700">
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
            <form onSubmit={handleAddRoute} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-1">
              <div className="mb-4 border-b border-slate-800 pb-4">
                <h2 className="text-lg font-semibold text-slate-100">{editingRouteId ? 'Edit Route' : 'Add Route'}</h2>
                <p className="mt-1 text-xs text-slate-500">Define main corridor links between terminals and city stops.</p>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Route Name"
                  value={routeForm.route_name}
                  onChange={e => setRouteForm({ ...routeForm, route_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Origin"
                  value={routeForm.origin}
                  onChange={e => setRouteForm({ ...routeForm, origin: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
                />
                <input
                  type="text"
                  placeholder="Destination"
                  value={routeForm.destination}
                  onChange={e => setRouteForm({ ...routeForm, destination: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60">
                    {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {editingRouteId ? 'Update' : 'Add'}
                  </button>
                  {editingRouteId && (
                    <button type="button" onClick={() => { setEditingRouteId(null); setRouteForm({ route_name: '', origin: '', destination: '' }); }} className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-2">
              <div className="mb-4 border-b border-slate-800 pb-4">
                <h2 className="text-lg font-semibold text-slate-100">Routes</h2>
                <p className="mt-1 text-xs text-slate-500">All active directional path definitions used by dispatch.</p>
              </div>
              <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {routes.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-sm text-slate-400">No routes yet</p>
                ) : (
                  routes.map(route => (
                    <div key={route.route_id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/70 p-3 transition hover:border-slate-500">
                      <div className="flex-1">
                        <p className="font-semibold text-white">{route.route_name}</p>
                        <p className="text-sm text-slate-400">{route.origin || 'Origin N/A'} to {route.destination || 'Destination N/A'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingRouteId(route.route_id); setRouteForm(route); }} className="rounded-lg border border-slate-700 p-2 transition hover:bg-slate-700">
                          <Edit className="h-4 w-4 text-sky-400" />
                        </button>
                        <button onClick={() => handleDeleteRoute(route.route_id)} className="rounded-lg border border-slate-700 p-2 transition hover:bg-slate-700">
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
            <form onSubmit={handleAddFleet} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-1">
              <div className="mb-4 border-b border-slate-800 pb-4">
                <h2 className="text-lg font-semibold text-slate-100">{editingFleetId ? 'Edit Fleet' : 'Add Fleet'}</h2>
                <p className="mt-1 text-xs text-slate-500">Manage vehicle units and seat/standing capacity distribution.</p>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Plate Number"
                  value={fleetForm.plate_number}
                  onChange={e => setFleetForm({ ...fleetForm, plate_number: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
                  required
                />
                <input
                  type="number"
                  placeholder="Seated Capacity"
                  value={fleetForm.seated_capacity}
                  onChange={e => setFleetForm({ ...fleetForm, seated_capacity: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
                  required
                />
                <input
                  type="number"
                  placeholder="Standing Capacity"
                  value={fleetForm.standing_capacity}
                  onChange={e => setFleetForm({ ...fleetForm, standing_capacity: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
                  required
                />
                <select
                  value={fleetForm.fleet_type}
                  onChange={e => setFleetForm({ ...fleetForm, fleet_type: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
                <div className="flex gap-2">
                  <button type="submit" disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60">
                    {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {editingFleetId ? 'Update' : 'Add'}
                  </button>
                  {editingFleetId && (
                    <button type="button" onClick={() => { setEditingFleetId(null); setFleetForm({ plate_number: '', seated_capacity: '', standing_capacity: '', fleet_type: 'public' }); }} className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-2">
              <div className="mb-4 border-b border-slate-800 pb-4">
                <h2 className="text-lg font-semibold text-slate-100">Fleets</h2>
                <p className="mt-1 text-xs text-slate-500">Vehicle inventory and live carrying-capacity metadata.</p>
              </div>
              <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {fleets.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-sm text-slate-400">No fleets yet</p>
                ) : (
                  fleets.map(fleet => (
                    <div key={fleet.fleet_id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/70 p-3 transition hover:border-slate-500">
                      <div className="flex-1">
                        <p className="font-semibold text-white">{fleet.plate_number}</p>
                        <p className="text-sm text-slate-400">{fleet.seated_capacity} seated + {fleet.standing_capacity} standing = {fleet.capacity} total</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingFleetId(fleet.fleet_id); setFleetForm(fleet); }} className="rounded-lg border border-slate-700 p-2 transition hover:bg-slate-700">
                          <Edit className="h-4 w-4 text-sky-400" />
                        </button>
                        <button onClick={() => handleDeleteFleet(fleet.fleet_id)} className="rounded-lg border border-slate-700 p-2 transition hover:bg-slate-700">
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
            <form onSubmit={handleCreateAccount} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-1">
              <div className="mb-4 border-b border-slate-800 pb-4">
                <h2 className="text-lg font-semibold text-slate-100">Create Account</h2>
                <p className="mt-1 text-xs text-slate-500">Provision new company users for operational staffing.</p>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Name"
                  value={accountForm.name}
                  onChange={e => setAccountForm({ ...accountForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={accountForm.email}
                  onChange={e => setAccountForm({ ...accountForm, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={accountForm.password}
                  onChange={e => setAccountForm({ ...accountForm, password: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={accountForm.phone_num}
                  onChange={e => setAccountForm({ ...accountForm, phone_num: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
                  required
                />
                <select
                  value={accountForm.role}
                  onChange={e => setAccountForm({ ...accountForm, role: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
                >
                  <option value="driver">Driver</option>
                  <option value="conductor">Conductor</option>
                </select>
                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Account
                </button>
              </div>
            </form>

            <div className="grid gap-4 lg:col-span-2 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="mb-4 border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-semibold text-slate-100">Drivers ({allDrivers.length})</h2>
                  <p className="mt-1 text-xs text-slate-500">Active vehicle operators.</p>
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {allDrivers.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-sm text-slate-400">No drivers yet</p>
                  ) : (
                    allDrivers.map(driver => (
                      <div key={driver.company_user_id} className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                        <p className="font-semibold text-white">{driver.name}</p>
                        <p className="text-sm text-slate-400">{driver.email}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="mb-4 border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-semibold text-slate-100">Conductors ({allConductors.length})</h2>
                  <p className="mt-1 text-xs text-slate-500">Fare and passenger flow personnel.</p>
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {allConductors.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-sm text-slate-400">No conductors yet</p>
                  ) : (
                    allConductors.map(conductor => (
                      <div key={conductor.company_user_id} className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                        <p className="font-semibold text-white">{conductor.name}</p>
                        <p className="text-sm text-slate-400">{conductor.email}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
