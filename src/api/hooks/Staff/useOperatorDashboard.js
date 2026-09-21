import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import OperatorService from '../../StaffService/OperatorService';
import { initFcmAndGetToken, stopForegroundListener } from '../../../services/fcmService';

// Architecture audit follow-up (CONF-03): OperatorDashboard.jsx's main
// orchestrator component and its NotificationBell sub-component both called
// OperatorService directly with no hook layer in between. This hook file
// now owns that data/effects; the components only render, consuming the
// values/handlers returned here — mirrors useDriverDashboard.js /
// useConductorDashboard.js.
//
// NOTE: OperatorDashboard.jsx's 5 large Tab sub-components (FleetsTab,
// RoutesTab, TripsTab, ReportsTab, StaffDirectoryTab) still call
// OperatorService directly and are NOT covered by this hook — each is its
// own self-contained component (not a monolith like Driver/Conductor were),
// so extracting them is a separate, larger follow-up tracked in
// ARCHITECTURE_AUDIT.md rather than rushed here.

/**
 * Main dashboard orchestrator: bootstrap data (profile/trips/staff/fleets/
 * routes/stops), FCM registration, trip polling, and logout. Previously the
 * top-level `OperatorDashboard()` component's own state/effects.
 */
export function useOperatorDashboardData() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [conductors, setConductors] = useState([]);
  const [fleets, setFleets] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const hasBootstrappedRef = useRef(false);
  const tripsPollInFlightRef = useRef(false);
  const hasLiveOpsTrips = trips.some((trip) => ['boarding', 'departed', 'in-progress'].includes(String(trip?.status || '').toLowerCase()));

  const loadFull = useCallback(async () => {
    try {
      const [profRes, tripsRes, driversRes, conductorsRes, fleetsRes, routesRes, stopsRes] = await Promise.allSettled([
        OperatorService.getProfile('operator'),
        OperatorService.getOperatorTrips(),
        OperatorService.getOperatorDrivers(),
        OperatorService.getOperatorConductors(),
        OperatorService.getOperatorFleets(),
        OperatorService.getOperatorRoutes(),
        OperatorService.getOperatorStops(),
      ]);
      if (profRes.status === 'fulfilled') {
        const p = profRes.value?.data ?? profRes.value;
        setProfile(p);
      } else { navigate('/employee/login'); return; }
      if (tripsRes.status === 'fulfilled')      setTrips(Array.isArray(tripsRes.value?.data) ? tripsRes.value.data : []);
      if (driversRes.status === 'fulfilled')    setDrivers(Array.isArray(driversRes.value?.data) ? driversRes.value.data : []);
      if (conductorsRes.status === 'fulfilled') setConductors(Array.isArray(conductorsRes.value?.data) ? conductorsRes.value.data : []);
      if (fleetsRes.status === 'fulfilled')     setFleets(Array.isArray(fleetsRes.value?.data) ? fleetsRes.value.data : []);
      if (routesRes.status === 'fulfilled')     setRoutes(Array.isArray(routesRes.value?.data) ? routesRes.value.data : []);
      if (stopsRes.status === 'fulfilled')      setStops(Array.isArray(stopsRes.value?.data) ? stopsRes.value.data : []);
    } finally { setLoading(false); }
  }, [navigate]);

  const loadTripsOnly = useCallback(async () => {
    if (tripsPollInFlightRef.current) return;
    tripsPollInFlightRef.current = true;
    try {
      const tripsRes = await OperatorService.getOperatorTrips();
      setTrips(Array.isArray(tripsRes?.data) ? tripsRes.data : []);
    } catch {
      // Keep existing trip state on transient poll errors.
    } finally {
      tripsPollInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (hasBootstrappedRef.current) return;
    hasBootstrappedRef.current = true;
    void loadFull();
  }, [loadFull]);

  // Batch 15, Item 3: register for push notifications (payment-confirmation
  // alerts) and silently refresh trips data when one arrives while this tab
  // is in the foreground, instead of waiting on the next poll cycle. Fail-
  // soft — initFcmAndGetToken() resolves to null on any failure and this
  // effect simply does nothing further in that case.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await initFcmAndGetToken((payload) => {
        if (payload?.data?.type === 'payment_confirmed') {
          void loadTripsOnly();
        }
      });
      if (!cancelled && token) {
        try {
          await OperatorService.registerFcmToken(token);
        } catch {
          // Non-critical — silently ignore, matches FcmService's fail-soft design.
        }
      }
    })();
    return () => {
      cancelled = true;
      stopForegroundListener();
    };
  }, [loadTripsOnly]);

  useEffect(() => {
    if (activeTab !== 'dashboard') return undefined;
    if (!hasLiveOpsTrips) return undefined;

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void loadTripsOnly();
    }, 45000);

    return () => clearInterval(intervalId);
  }, [activeTab, hasLiveOpsTrips, loadTripsOnly]);

  const handleLogout = async () => {
    try { await OperatorService.logoutOperator(); } catch (error) { void error; }
    navigate('/employee/login');
  };

  // Extracted from an inline JSX arrow function (architecture audit
  // follow-up) so the render layer never calls OperatorService directly.
  const handleCreateAccount = useCallback(async (accountData) => {
    return await OperatorService.createEmployeeAccount(accountData);
  }, []);

  return {
    activeTab, setActiveTab,
    loading,
    profile,
    trips,
    drivers,
    conductors,
    fleets,
    routes,
    stops,
    loadFull,
    handleLogout,
    handleCreateAccount,
  };
}

/**
 * Operator-facing notification bell/badge — currently only populated by
 * trip declines (Driver/Chauffeur declining an assignment). Previously the
 * `NotificationBell()` component's own state/effects.
 */
export function useNotificationBell() {  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const res = await OperatorService.getNotifications();
      setNotifications(Array.isArray(res?.data?.notifications) ? res.data.notifications : []);
      setUnreadCount(Number(res?.data?.unread_count ?? 0));
    } catch {
      // Keep last-known state on transient poll errors.
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadNotifications();
    }, 0);
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void loadNotifications();
    }, 45000);
    return () => {
      clearTimeout(timer);
      clearInterval(intervalId);
    };
  }, [loadNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await OperatorService.markNotificationRead(id);
      void loadNotifications();
    } catch { /* no-op — bell state simply won't update this cycle */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await OperatorService.markAllNotificationsRead();
      void loadNotifications();
    } catch { /* no-op */ }
  };

  return {
    open, setOpen,
    notifications,
    unreadCount,
    loadingNotifications,
    handleMarkRead,
    handleMarkAllRead,
  };
}

const DISPATCH_STORAGE_KEY = 'smarttransit.operator.dispatch.decisions';

/**
 * Dispatch accept/keep decisions for DashboardTab's route-health/predictive
 * reroute panel — persisted to localStorage so a page refresh doesn't lose
 * the operator's in-progress decisions. Previously DashboardTab's own
 * `selectedDispatch`/`dispatching` state and `handleDispatchDecision`.
 */
export function useDispatchDecisions(trips) {
  const [selectedDispatch, setSelectedDispatch] = useState(() => {
    if (typeof window === 'undefined' || !window.localStorage) return {};

    try {
      const raw = window.localStorage.getItem(DISPATCH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [dispatching, setDispatching] = useState({});

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      window.localStorage.setItem(DISPATCH_STORAGE_KEY, JSON.stringify(selectedDispatch));
    } catch {
      // Ignore storage issues in restricted environments.
    }
  }, [selectedDispatch]);

  const handleDispatchDecision = useCallback((routeName, decision, meta = {}) => {
    const matchedTrip = trips.find(trip => (trip.fleet_route?.route?.route_name || 'Unassigned Route') === routeName);
    const tripId = matchedTrip?.trip_id;

    setSelectedDispatch(prev => ({ ...prev, [routeName]: decision }));

    if (!tripId) return;

    setDispatching(prev => ({ ...prev, [routeName]: true }));

    const payload = {
      decision,
      route: meta.alternativeRoute || routeName,
      reason: meta.reason || meta.recommendation || `${decision === 'accept' ? 'Operator accepted the reroute recommendation.' : 'Operator kept the current route.'}`,
    };

    OperatorService.saveDispatchDecision(tripId, payload)
      .catch(() => {
        setSelectedDispatch(prev => ({ ...prev, [routeName]: decision }));
      })
      .finally(() => {
        setDispatching(prev => ({ ...prev, [routeName]: false }));
      });
  }, [trips]);

  return { selectedDispatch, dispatching, handleDispatchDecision };
}

/**
 * Thin wrapper so FleetTrackingMap (a map-lifecycle-bound component whose
 * route-geometry cache is a per-instance ref tied to its own MapLibre
 * instance) doesn't import OperatorService directly. The caching/draw
 * logic stays in the component since it's tightly coupled to the map
 * instance's lifecycle, not general application data.
 */
export async function fetchOperatorRouteStops(routeId) {
  return await OperatorService.getRouteStops(routeId);
}

/**
 * All state, effects, and handlers for FleetsTab (fleet creation, route
 * assignment, fare rules, live GPS locations, focused-trip map view).
 * Previously FleetsTab's own state/effects.
 */
export function useFleetsTab({ onRefresh }) {
  const [focusedTripId, setFocusedTripId] = useState(null);
  const [fleetLocations, setFleetLocations] = useState([]);
  const [manageMsg, setManageMsg] = useState('');
  const [manageSaving, setManageSaving] = useState(false);
  const [fleetForm, setFleetForm] = useState({ plate_number: '', seated_capacity: '', standing_capacity: '', fleet_type: 'public' });
  const [assignForm, setAssignForm] = useState({ fleet_id: '', route_id: '' });
  const [fareForm, setFareForm] = useState({ fleet_id: '', seat_type: 'seated', base_fare: '', fare_per_km: '', step_up_token: '' });
  const [fareSaving, setFareSaving] = useState(false);
  const [fareMsg, setFareMsg] = useState('');

  const refreshFleetLocations = useCallback(async () => {
    try {
      const res = await OperatorService.getFleetLocations();
      setFleetLocations(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setFleetLocations([]);
    }
  }, []);

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      void refreshFleetLocations();
    }, 0);
    const timer = setInterval(() => {
      if (!document.hidden && navigator.onLine) {
        void refreshFleetLocations();
      }
    }, 15000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(timer);
    };
  }, [refreshFleetLocations]);

  useEffect(() => {
    if (!focusedTripId) return;
    const timer = setTimeout(() => {
      void refreshFleetLocations();
    }, 0);

    return () => clearTimeout(timer);
  }, [focusedTripId, refreshFleetLocations]);

  const statusToProgress = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'completed') return 100;
    if (normalized === 'in-progress' || normalized === 'departed') return 72;
    if (normalized === 'boarding') return 45;
    if (normalized === 'delayed') return 28;
    if (normalized === 'scheduled') return 20;
    return 12;
  };

  const statusLabel = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'in-progress' || normalized === 'departed' || normalized === 'boarding') return 'Ongoing';
    if (normalized === 'delayed') return 'Delayed';
    if (normalized === 'scheduled') return 'Upcoming';
    if (normalized === 'completed') return 'Completed';
    return 'Pending';
  };

  const getLocationForTrip = (tripItem) => {
    if (!tripItem) return null;

    const tripId = Number(tripItem?.trip_id);
    const fleetId = Number(tripItem?.fleet_route?.fleet?.fleet_id);

    return fleetLocations.find((entry) => {
      const entryTripId = Number(entry?.trip_id);
      const entryFleetId = Number(entry?.fleet_id);
      if (Number.isFinite(tripId) && tripId > 0 && entryTripId === tripId) return true;
      if (Number.isFinite(fleetId) && fleetId > 0 && entryFleetId === fleetId) return true;
      return false;
    }) || null;
  };

  const getLocationByFleet = (fleetId) => fleetLocations.find((entry) => Number(entry?.fleet_id) === Number(fleetId)) || null;

  const handleCreateFleet = async (event) => {
    event.preventDefault();
    setManageMsg('');
    setManageSaving(true);
    try {
      await OperatorService.createFleet({
        plate_number: fleetForm.plate_number,
        seated_capacity: Number(fleetForm.seated_capacity),
        standing_capacity: Number(fleetForm.standing_capacity),
        fleet_type: fleetForm.fleet_type,
      });
      setFleetForm({ plate_number: '', seated_capacity: '', standing_capacity: '', fleet_type: 'public' });
      setManageMsg('Fleet created successfully.');
      onRefresh();
    } catch (err) {
      setManageMsg(err?.message || 'Failed to create fleet.');
    } finally {
      setManageSaving(false);
    }
  };

  const handleAssignRoute = async (event) => {
    event.preventDefault();
    setManageMsg('');
    setManageSaving(true);
    try {
      await OperatorService.assignRouteToFleet(Number(assignForm.fleet_id), { route_id: Number(assignForm.route_id) });
      setAssignForm({ fleet_id: '', route_id: '' });
      setManageMsg('Route assigned to fleet successfully.');
      onRefresh();
    } catch (err) {
      setManageMsg(err?.message || 'Failed to assign route to fleet.');
    } finally {
      setManageSaving(false);
    }
  };

  const handleApplyFareRule = async (event) => {
    event.preventDefault();
    setFareMsg('');
    setFareSaving(true);

    try {
      await OperatorService.createFareRule({
        fleet_id: Number(fareForm.fleet_id),
        seat_type: fareForm.seat_type,
        base_fare: Number(fareForm.base_fare),
        fare_per_km: Number(fareForm.fare_per_km),
      }, fareForm.step_up_token || null);

      setFareForm((prev) => ({ ...prev, base_fare: '', fare_per_km: '', step_up_token: '' }));
      setFareMsg('Fare rule applied successfully.');
    } catch (err) {
      setFareMsg(err?.message || 'Failed to apply fare rule. Ensure your step-up token is valid.');
    } finally {
      setFareSaving(false);
    }
  };

  const openFleetMap = (fleetId) => {
    const location = getLocationByFleet(fleetId);
    const lat = Number(location?.latitude);
    const lng = Number(location?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank', 'noopener,noreferrer');
  };

  return {
    focusedTripId, setFocusedTripId,
    fleetLocations,
    manageMsg,
    manageSaving,
    fleetForm, setFleetForm,
    assignForm, setAssignForm,
    fareForm, setFareForm,
    fareSaving,
    fareMsg,
    refreshFleetLocations,
    statusToProgress,
    statusLabel,
    getLocationForTrip,
    getLocationByFleet,
    handleCreateFleet,
    handleAssignRoute,
    handleApplyFareRule,
    openFleetMap,
  };
}

/**
 * All state, effects, and handlers for RoutesTab (stop CRUD, route
 * creation, stop-to-route assignment). Previously RoutesTab's own
 * state/effects.
 */
export function useRoutesTab({ onRefresh }) {
  const [manageMsg, setManageMsg] = useState('');
  const [manageSaving, setManageSaving] = useState(false);
  const [editingStopId, setEditingStopId] = useState(null);
  const [stopForm, setStopForm] = useState({ stop_name: '', location: '' });
  const [routeForm, setRouteForm] = useState({ route_name: '', origin: '', destination: '' });
  const [routeStopForm, setRouteStopForm] = useState({ route_id: '', stop_id: '', stop_order: '' });
  const [assignedStopIds, setAssignedStopIds] = useState([]);
  const [suggestedStopOrder, setSuggestedStopOrder] = useState('');

  const handleCreateStop = async (event) => {
    event.preventDefault();
    setManageSaving(true);
    setManageMsg('');
    try {
      const payload = {
        stop_name: stopForm.stop_name,
        location: stopForm.location,
      };

      if (editingStopId) {
        await OperatorService.updateOperatorStop(editingStopId, payload);
      } else {
        await OperatorService.createOperatorStop(payload);
      }

      setStopForm({ stop_name: '', location: '' });
      setEditingStopId(null);
      setManageMsg(editingStopId ? 'Stop updated successfully.' : 'Stop created successfully.');
      onRefresh();
    } catch (err) {
      setManageMsg(err?.message || 'Failed to save stop.');
    } finally {
      setManageSaving(false);
    }
  };

  const handleDeleteStop = async (stopId) => {
    if (!window.confirm('Delete this stop?')) return;
    setManageSaving(true);
    setManageMsg('');
    try {
      await OperatorService.deleteOperatorStop(stopId);
      if (Number(editingStopId) === Number(stopId)) {
        setEditingStopId(null);
        setStopForm({ stop_name: '', location: '' });
      }
      setManageMsg('Stop deleted successfully.');
      onRefresh();
    } catch (err) {
      setManageMsg(err?.message || 'Failed to delete stop.');
    } finally {
      setManageSaving(false);
    }
  };

  const handleRemoveStopFromRoute = async (routeId, routeStopId) => {
    if (!routeId || !routeStopId) return;
    if (!window.confirm('Remove this stop from route?')) return;
    setManageSaving(true);
    setManageMsg('');
    try {
      await OperatorService.removeOperatorStopFromRoute(Number(routeId), Number(routeStopId));
      setManageMsg('Stop removed from route successfully.');
      onRefresh();
    } catch (err) {
      setManageMsg(err?.message || 'Failed to remove stop from route.');
    } finally {
      setManageSaving(false);
    }
  };

  const handleCreateRoute = async (event) => {
    event.preventDefault();
    setManageSaving(true);
    setManageMsg('');
    try {
      await OperatorService.createOperatorRoute(routeForm);
      setRouteForm({ route_name: '', origin: '', destination: '' });
      setManageMsg('Route created successfully.');
      onRefresh();
    } catch (err) {
      setManageMsg(err?.message || 'Failed to create route.');
    } finally {
      setManageSaving(false);
    }
  };

  const handleAddStopToRoute = async (event) => {
    event.preventDefault();
    setManageSaving(true);
    setManageMsg('');
    try {
      await OperatorService.addOperatorStopToRoute(Number(routeStopForm.route_id), {
        stop_id: Number(routeStopForm.stop_id),
        stop_order: Number(routeStopForm.stop_order || suggestedStopOrder || 1),
      });
      setRouteStopForm((prev) => ({
        route_id: prev.route_id,
        stop_id: '',
        stop_order: String(Number(prev.stop_order || suggestedStopOrder || 1) + 1),
      }));
      setManageMsg('Stop assigned to route successfully.');
      onRefresh();
    } catch (err) {
      setManageMsg(err?.message || 'Failed to assign stop to route.');
    } finally {
      setManageSaving(false);
    }
  };

  useEffect(() => {
    const routeId = Number(routeStopForm.route_id);
    if (!Number.isFinite(routeId) || routeId <= 0) {
      const resetTimer = setTimeout(() => {
        setAssignedStopIds([]);
        setSuggestedStopOrder('');
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    let cancelled = false;
    OperatorService.getOperatorRoute(routeId)
      .then((res) => {
        if (cancelled) return;
        const routeStops = res?.data?.route_stops || res?.data?.routeStops || [];
        const nextAssigned = routeStops
          .map((row) => Number(row?.stop_id))
          .filter((value) => Number.isFinite(value));
        const maxOrder = routeStops.reduce((max, row) => {
          const value = Number(row?.stop_order);
          return Number.isFinite(value) ? Math.max(max, value) : max;
        }, 0);

        setAssignedStopIds(nextAssigned);
        const nextOrder = String(maxOrder + 1);
        setSuggestedStopOrder(nextOrder);
        setRouteStopForm((prev) => ({
          ...prev,
          stop_order: prev.stop_order || nextOrder,
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setAssignedStopIds([]);
      });

    return () => {
      cancelled = true;
    };
  }, [routeStopForm.route_id]);

  return {
    manageMsg,
    manageSaving,
    editingStopId, setEditingStopId,
    stopForm, setStopForm,
    routeForm, setRouteForm,
    routeStopForm, setRouteStopForm,
    assignedStopIds,
    suggestedStopOrder,
    handleCreateStop,
    handleDeleteStop,
    handleRemoveStopFromRoute,
    handleCreateRoute,
    handleAddStopToRoute,
  };
}

/**
 * All state, effects, and handlers for TripsTab (schedule/assign/board/
 * depart/complete/status-override, GPS history, trip-list filtering).
 * Previously TripsTab's own state/effects.
 */
export function useTripsTab({ trips, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  // S1 (Batch 13): default to "Scheduled / Active" rather than "All",
  // consistent with the passenger ticket filter's default-to-relevant-view
  // pattern (Batch 12 S2).
  const [tripFilter, setTripFilter] = useState('scheduled');
  const [gpsHistory, setGpsHistory] = useState([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMessage, setGpsMessage] = useState('');
  const [assignModal, setAssignModal] = useState(null);
  const [confirmComplete, setConfirmComplete] = useState(null); // trip object pending confirmation
  const [statusOverrideSaving, setStatusOverrideSaving] = useState(false);
  const [statusOverrideMsg, setStatusOverrideMsg] = useState('');
  const [form, setForm] = useState({ fleet_route_id: '', trip_date: '', departure_time: '', trip_type: 'one_way', return_departure_time: '', driver_id: '', conductor_id: '', notes: '' });
  const [assignId, setAssignId] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionInFlight, setActionInFlight] = useState(null); // tripId currently being actioned
  const [msg, setMsg] = useState('');
  const [fleetRoutes, setFleetRoutes] = useState([]);
  const [visibleTrips, setVisibleTrips] = useState(trips);

  useEffect(() => {
    OperatorService.getOperatorFleetRoutes().then(r => setFleetRoutes(r?.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadFilteredTrips = async () => {
      if (tripFilter === 'all') {
        setVisibleTrips(trips);
        return;
      }

      try {
        const res = await OperatorService.getOperatorTrips(tripFilter);
        if (!cancelled) {
          setVisibleTrips(Array.isArray(res?.data) ? res.data : []);
        }
      } catch {
        if (!cancelled) {
          setVisibleTrips([]);
        }
      }
    };

    void loadFilteredTrips();

    return () => {
      cancelled = true;
    };
  }, [tripFilter, trips]);

  const handleSchedule = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('');
    try {
      await OperatorService.scheduleTrip({
        fleet_route_id: Number(form.fleet_route_id),
        trip_date: form.trip_date,
        departure_time: form.departure_time,
        trip_type: form.trip_type,
        return_departure_time: form.trip_type === 'round_trip' ? form.return_departure_time : null,
        driver_id: Number(form.driver_id),
        conductor_id: Number(form.conductor_id),
        notes: form.notes,
      });
      setMsg('Trip scheduled.'); setForm({ fleet_route_id: '', trip_date: '', departure_time: '', trip_type: 'one_way', return_departure_time: '', driver_id: '', conductor_id: '', notes: '' }); setShowModal(false); onRefresh();
    } catch (err) { setMsg(err?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handleAssign = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('');
    try {
      if (assignModal.type === 'driver') await OperatorService.assignDriver(assignModal.trip.trip_id, Number(assignId));
      else await OperatorService.assignConductor(assignModal.trip.trip_id, Number(assignId));
      setMsg('Assigned.'); setAssignModal(null); onRefresh();
    } catch (err) { setMsg(err?.message || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handleAction = async (tripId, action) => {
    if (action === 'complete') {
      const trip = trips.find(t => t.trip_id === tripId);
      setConfirmComplete(trip);
      return;
    }
    setActionInFlight(tripId);
    try {
      if (action === 'boarding') await OperatorService.startBoarding(tripId);
      else if (action === 'depart') await OperatorService.operatorDepartTrip(tripId);
      onRefresh();
    } catch (err) { setMsg(err?.message || 'Action failed.'); }
    finally { setActionInFlight(null); }
  };

  const handleConfirmedComplete = async () => {
    const tripId = confirmComplete.trip_id;
    setConfirmComplete(null);
    setActionInFlight(tripId);
    try {
      await OperatorService.operatorCompleteTrip(tripId);
      onRefresh();
    } catch (err) { setMsg(err?.message || 'Failed to complete trip.'); }
    finally { setActionInFlight(null); }
  };

  // Manual status override — for a trip the driver forgot to mark completed
  // (server enforces: operators may only force an already-departed trip to
  // 'completed'; admins have full override elsewhere).
  const handleStatusOverride = async (tripId, status) => {
    setStatusOverrideSaving(true);
    setStatusOverrideMsg('');
    try {
      const res = await OperatorService.overrideTripStatus(tripId, status);
      setStatusOverrideMsg('Status updated.');
      setSelectedTrip(res?.data ?? null);
      onRefresh();
    } catch (err) {
      setStatusOverrideMsg(err?.message || 'Failed to update status.');
    } finally {
      setStatusOverrideSaving(false);
    }
  };

  const loadTripGpsHistory = async (tripId) => {
    if (!tripId) return;
    setGpsLoading(true);
    setGpsMessage('');
    try {
      const res = await OperatorService.getOperatorTripGpsHistory(tripId, { limit: 100 });
      const rows = Array.isArray(res?.data) ? res.data : [];
      setGpsHistory(rows);
      if (rows.length === 0) setGpsMessage('No GPS history points recorded yet for this trip.');
    } catch (err) {
      setGpsHistory([]);
      setGpsMessage(err?.message || 'Failed to load GPS history.');
    } finally {
      setGpsLoading(false);
    }
  };

  return {
    showModal, setShowModal,
    selectedTrip, setSelectedTrip,
    tripFilter, setTripFilter,
    gpsHistory,
    gpsLoading,
    gpsMessage,
    assignModal, setAssignModal,
    confirmComplete, setConfirmComplete,
    statusOverrideSaving,
    statusOverrideMsg,
    form, setForm,
    assignId, setAssignId,
    saving,
    actionInFlight,
    msg, setMsg,
    fleetRoutes,
    visibleTrips,
    handleSchedule,
    handleAssign,
    handleAction,
    handleConfirmedComplete,
    handleStatusOverride,
    loadTripGpsHistory,
  };
}

/**
 * State/handler for ReportsTab's fleet report generation (financial,
 * revenue-by-route, adherence, occupancy, daily summary, payment
 * channels). Previously ReportsTab's own state and `fetchReport`.
 */
export function useReportsTab() {
  const [selectedFleet, setSelectedFleet] = useState('');
  const [reportType, setReportType] = useState('financial');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchReport = async () => {
    if (!selectedFleet) { setMsg('Please select a fleet first.'); return; }
    setLoading(true); setMsg(''); setReport(null);
    try {
      let res;
      if (reportType === 'financial')  res = await OperatorService.getFinancialReport(selectedFleet);
      else if (reportType === 'revenue')   res = await OperatorService.getRevenueByRoute(selectedFleet);
      else if (reportType === 'adherence') res = await OperatorService.getRouteAdherence(selectedFleet);
      else if (reportType === 'occupancy') res = await OperatorService.getOccupancyTrends(selectedFleet);
      else if (reportType === 'daily')     res = await OperatorService.getDailySummary(selectedFleet);
      else if (reportType === 'channels')  res = await OperatorService.getPaymentChannels(selectedFleet);
      setReport(res?.data ?? res);
    } catch (err) { setMsg(err?.message || 'Failed to load report.'); }
    finally { setLoading(false); }
  };

  return {
    selectedFleet, setSelectedFleet,
    reportType, setReportType,
    report,
    loading,
    msg, setMsg,
    fetchReport,
  };
}
