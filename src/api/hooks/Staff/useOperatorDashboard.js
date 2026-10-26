import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import OperatorService from '../../StaffService/OperatorService';
import { initFcmAndGetToken, stopForegroundListener } from '../../../services/fcmService';
import { OPERATOR_ROLE, buildLocationSearch, defaultView, resolveOperatorLocation } from '../../../utils/operatorNav';
import { isRangeSchedule, rangeKey, rangePayload } from '../../../utils/scheduleRange';

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
  const location = useLocation();
  // Batch 27, Task 1: a link may open a given tab (?tab=trips&trip=ID); read once. Batch 30: an old tab name (trips,
  // calendar, shiftBlocks, financials, remittances) opens its new place (Schedule or Finance, with a view), and the
  // address is rewritten to it, so the sidebar item and view live in the address.
  const [nav, setNav] = useState(() => resolveOperatorLocation(typeof window !== 'undefined' ? window.location.search : '', OPERATOR_ROLE));
  const activeTab = nav.tab;
  const view = nav.view;
  const setActiveTab = useCallback((tab, nextView = null) => {
    setNav({ tab, view: nextView ?? defaultView(tab, OPERATOR_ROLE), redirected: false });
  }, []);
  const setView = useCallback((nextView) => setNav((prev) => ({ ...prev, view: nextView })), []);
  useEffect(() => {
    const search = buildLocationSearch(location.search, nav.tab, nav.view);
    if (search !== location.search) navigate({ pathname: location.pathname, search }, { replace: true });
  }, [nav.tab, nav.view, location.pathname, location.search, navigate]);
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
        OperatorService.getOperatorTrips('scheduled', { page: 1, per_page: 100 }),
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
      const tripsRes = await OperatorService.getOperatorTrips('scheduled', { page: 1, per_page: 100 });
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
    view, setView,
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
 * C6: pending "For Approval" decline requests from drivers/Chauffeurs. The
 * server decides; this only lists and forwards approve/reject.
 */
export function useTripRequests(onDecided) {
  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await OperatorService.getTripRequests();
      setRequests(Array.isArray(res?.data?.requests) ? res.data.requests : []);
      setError('');
    } catch (err) {
      setError(err?.message || 'Could not load approval requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    const interval = setInterval(() => { void load(); }, 30000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [load]);

  const decide = useCallback(async (id, decision) => {
    setBusyId(id);
    setError('');
    try {
      if (decision === 'approve') await OperatorService.approveTripRequest(id);
      else await OperatorService.rejectTripRequest(id);
      await load();
      onDecided?.();
    } catch (err) {
      setError(err?.message || 'Could not update the request.');
      await load();
    } finally {
      setBusyId(null);
    }
  }, [load, onDecided]);

  return { requests, busyId, error, loading, decide };
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
  const [fleetForm, setFleetForm] = useState({ plate_number: '', bus_company_name: '', body_no: '', seated_capacity: '', standing_capacity: '', fleet_type: 'public', vehicle_class: '', route_id: '', start_time: '06:00', end_time: '22:00' });
  const [assignForm, setAssignForm] = useState({ fleet_id: '', route_id: '', start_time: '06:00', end_time: '22:00' });

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
        bus_company_name: fleetForm.bus_company_name || '',
        body_no: fleetForm.body_no || '',
        seated_capacity: Number(fleetForm.seated_capacity),
        standing_capacity: Number(fleetForm.standing_capacity),
        fleet_type: fleetForm.fleet_type,
        vehicle_class: fleetForm.vehicle_class || null,
        ...(fleetForm.route_id
          ? { routes: [{ route_id: Number(fleetForm.route_id), start_time: String(fleetForm.start_time || '').trim(), end_time: String(fleetForm.end_time || '').trim() }] }
          : {}),
      });
      setFleetForm({ plate_number: '', bus_company_name: '', body_no: '', seated_capacity: '', standing_capacity: '', fleet_type: 'public', vehicle_class: '', route_id: '', start_time: '06:00', end_time: '22:00' });
      setManageMsg('Fleet created successfully.');
      onRefresh();
      return true;
    } catch (err) {
      setManageMsg(err?.message || 'Failed to create fleet.');
      return false;
    } finally {
      setManageSaving(false);
    }
  };

  const handleAssignRoute = async (event) => {
    event.preventDefault();
    setManageMsg('');
    setManageSaving(true);
    try {
      await OperatorService.assignRouteToFleet(Number(assignForm.fleet_id), {
        route_id: Number(assignForm.route_id),
        start_time: String(assignForm.start_time || '').trim(),
        end_time: String(assignForm.end_time || '').trim(),
      });
      setAssignForm({ fleet_id: '', route_id: '', start_time: '06:00', end_time: '22:00' });
      setManageMsg('Route assigned to fleet successfully.');
      onRefresh();
      return true;
    } catch (err) {
      setManageMsg(err?.message || 'Failed to assign route to fleet.');
      return false;
    } finally {
      setManageSaving(false);
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
    clearManageMsg: () => setManageMsg(''),
    manageSaving,
    fleetForm, setFleetForm,
    assignForm, setAssignForm,
    refreshFleetLocations,
    statusToProgress,
    statusLabel,
    getLocationForTrip,
    getLocationByFleet,
    handleCreateFleet,
    handleAssignRoute,
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
      return true;
    } catch (err) {
      setManageMsg(err?.message || 'Failed to save stop.');
      return false;
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

  const handleToggleStopExpress = async (routeId, routeStopId, served) => {
    setManageSaving(true);
    setManageMsg('');
    try {
      await OperatorService.setOperatorRouteStopExpress(Number(routeId), Number(routeStopId), served);
      setManageMsg(served ? 'Express trips will stop here.' : 'Express trips will no longer stop here.');
      onRefresh();
    } catch (err) {
      setManageMsg(err?.message || 'Failed to update express stop setting.');
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
      return true;
    } catch (err) {
      setManageMsg(err?.message || 'Failed to create route.');
      return false;
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
      return true;
    } catch (err) {
      setManageMsg(err?.message || 'Failed to assign stop to route.');
      return false;
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
    clearManageMsg: () => setManageMsg(''),
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
    handleToggleStopExpress,
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
  const [form, setForm] = useState({
    fleet_route_id: '',
    trip_date: '',
    to_date: '',
    departure_time: '',
    trip_type: 'one_way',
    return_departure_time: '',
    driver_id: '',
    conductor_id: '',
    notes: '',
    block_type: 'morning',
    service_type: 'regular',
    leg_departure_times: ['06:00', '08:30', '11:00', '13:30'],
  });
  const [assignId, setAssignId] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionInFlight, setActionInFlight] = useState(null); // tripId currently being actioned
  const [msg, setMsg] = useState('');
  const [fleetRoutes, setFleetRoutes] = useState([]);
  const [visibleTrips, setVisibleTrips] = useState(trips);
  const [visibleTripsMeta, setVisibleTripsMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loadingMoreTrips, setLoadingMoreTrips] = useState(false);

  useEffect(() => {
    OperatorService.getOperatorFleetRoutes().then(r => setFleetRoutes(r?.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadFilteredTrips = async () => {
      try {
        const res = await OperatorService.getOperatorTrips(tripFilter, { page: 1, per_page: 100 });
        if (!cancelled) {
          setVisibleTrips(Array.isArray(res?.data) ? res.data : []);
          setVisibleTripsMeta(res?.meta ?? { current_page: 1, last_page: 1, total: res?.data?.length ?? 0 });
        }
      } catch {
        if (!cancelled) {
          setVisibleTrips([]);
          setVisibleTripsMeta({ current_page: 1, last_page: 1, total: 0 });
        }
      }
    };

    void loadFilteredTrips();

    return () => {
      cancelled = true;
    };
  }, [tripFilter, trips]);

  const loadMoreTrips = async () => {
    if (loadingMoreTrips || visibleTripsMeta.current_page >= visibleTripsMeta.last_page) return;
    setLoadingMoreTrips(true);
    try {
      const nextPage = visibleTripsMeta.current_page + 1;
      const res = await OperatorService.getOperatorTrips(tripFilter, { page: nextPage, per_page: 100 });
      setVisibleTrips((previous) => [...previous, ...(Array.isArray(res?.data) ? res.data : [])]);
      setVisibleTripsMeta(res?.meta ?? visibleTripsMeta);
    } catch (error) {
      setMsg(error?.message || 'Could not load more trips. Please try again.');
    } finally {
      setLoadingMoreTrips(false);
    }
  };

  // Phase B (§4.13): a multi-leg schedule with a To date after its From date is previewed first (the server checks
  // every day), then confirmed. A preview is only shown while the form still matches what was previewed.
  const [rangePreview, setRangePreview] = useState(null); // { key, data }
  const [rangeResult, setRangeResult] = useState(null);
  const rangeBusyRef = useRef(false);
  const currentRangePreview = rangePreview && rangePreview.key === rangeKey(form) ? rangePreview.data : null;

  const blankScheduleForm = () => ({
    fleet_route_id: '',
    trip_date: '',
    to_date: '',
    departure_time: '',
    trip_type: 'one_way',
    return_departure_time: '',
    driver_id: '',
    conductor_id: '',
    notes: '',
    block_type: 'morning',
    service_type: 'regular',
    leg_departure_times: ['06:00', '08:30', '11:00', '13:30'],
  });

  const runRangeRequest = async (request) => {
    if (rangeBusyRef.current) return; // a second tap while the first request is out does nothing
    rangeBusyRef.current = true;
    setSaving(true); setMsg('');
    try {
      await request();
    } catch (err) {
      setMsg(err?.message || 'Failed.');
    } finally {
      rangeBusyRef.current = false;
      setSaving(false);
    }
  };

  const previewRange = () => runRangeRequest(async () => {
    const key = rangeKey(form);
    const res = await OperatorService.previewShiftBlockRange(rangePayload(form));
    setRangePreview({ key, data: res?.data ?? null });
  });

  const confirmRange = () => runRangeRequest(async () => {
    const res = await OperatorService.createShiftBlockRange(rangePayload(form));
    setRangeResult({ ...(res?.data ?? {}), message: res?.message || '' });
    setRangePreview(null);
    onRefresh();
  });

  const closeScheduleModal = () => {
    if (rangeResult) setForm(blankScheduleForm());
    setRangePreview(null);
    setRangeResult(null);
    setMsg('');
    setShowModal(false);
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (isRangeSchedule(form)) {
      await previewRange();
      return;
    }
    setSaving(true); setMsg('');
    try {
      if (form.trip_type === 'round_trip') {
        await OperatorService.createShiftBlock({
          fleet_route_id: Number(form.fleet_route_id),
          driver_id: Number(form.driver_id),
          conductor_id: Number(form.conductor_id),
          block_type: form.block_type,
          scheduled_date: form.trip_date,
          service_type: form.service_type || 'regular',
          leg_departure_times: Array.isArray(form.leg_departure_times)
            ? form.leg_departure_times
            : ['06:00', '08:30', '11:00', '13:30'],
        });
        setMsg('Shift block scheduled.');
      } else {
        await OperatorService.scheduleTrip({
          fleet_route_id: Number(form.fleet_route_id),
          trip_date: form.trip_date,
          departure_time: form.departure_time,
          trip_type: 'one_way',
          service_type: form.service_type || 'regular',
          return_departure_time: null,
          driver_id: Number(form.driver_id),
          conductor_id: Number(form.conductor_id),
          notes: form.notes,
        });
        setMsg('Ad hoc trip scheduled.');
      }

      setForm(blankScheduleForm());
      setShowModal(false);
      onRefresh();
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
    visibleTripsMeta,
    loadingMoreTrips,
    loadMoreTrips,
    handleSchedule,
    rangePreview: currentRangePreview,
    rangeResult,
    confirmRange,
    closeScheduleModal,
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
  const [reportType, setReportType] = useState('adherence'); // revenue figures moved to the Financials tab (Batch 29)
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  // The period. Empty means the server's default (this month so far). `ranRange` is the period the report on screen was
  // run for, so a print or a download names that period even if the pickers were changed afterwards.
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ranRange, setRanRange] = useState({ from: '', to: '' });

  const fetchReport = async () => {
    if (!selectedFleet) { setMsg('Please select a fleet first.'); return; }
    const isDailySummary = reportType === 'daily';
    if (!isDailySummary && startDate && endDate && endDate < startDate) { setMsg('The end date cannot be before the start date.'); return; }
    const params = {};
    if (isDailySummary) {
      if (startDate) params.date = startDate;
    } else {
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
    }
    setLoading(true); setMsg(''); setReport(null);
    try {
      let res;
      if (reportType === 'financial')  res = await OperatorService.getFinancialReport(selectedFleet, params);
      else if (reportType === 'revenue')   res = await OperatorService.getRevenueByRoute(selectedFleet, params);
      else if (reportType === 'adherence') res = await OperatorService.getRouteAdherence(selectedFleet, params);
      else if (reportType === 'occupancy') res = await OperatorService.getOccupancyTrends(selectedFleet, params);
      else if (reportType === 'daily')     res = await OperatorService.getDailySummary(selectedFleet, params);
      else if (reportType === 'channels')  res = await OperatorService.getPaymentChannels(selectedFleet, params);
      setReport(res?.data ?? res);
      setRanRange({ from: startDate, to: isDailySummary ? startDate : endDate });
    } catch (err) { setMsg(err?.message || 'Failed to load report.'); }
    finally { setLoading(false); }
  };

  const selectReportType = (type) => {
    setReportType(type);
    setReport(null);
    setMsg('');
  };

  return {
    selectedFleet, setSelectedFleet,
    reportType, setReportType: selectReportType,
    startDate, setStartDate,
    endDate, setEndDate,
    ranRange,
    report,
    loading,
    msg, setMsg,
    fetchReport,
  };
}

/**
 * Batch 18: Shift Block Hand-off System — Operator/Dispatcher tab.
 * Batch 30: the view filters on the cards it loaded (their status is the server's derived one), so there is no status
 * request parameter any more; `reloadToken` makes the list reload after a schedule was created elsewhere on the page.
 */
export function useShiftBlocksTab(reloadToken = 0) {
  const [blocks, setBlocks] = useState([]);
  const [blockCards, setBlockCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [fleetRoutes, setFleetRoutes] = useState([]);

  const loadBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await OperatorService.getShiftBlocks();
      setBlocks(Array.isArray(res?.data) ? res.data : []);
      // Batch 28: the cards (one per block, both roles' state) carry the status and section the view shows.
      try {
        const cardsRes = await OperatorService.getAssignmentBlocks();
        setBlockCards(Array.isArray(cardsRes?.data) ? cardsRes.data : []);
      } catch {
        setBlockCards([]);
      }
    } catch (err) {
      setMsg(err?.message || 'Failed to load shift blocks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadBlocks();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadBlocks, reloadToken]);

  useEffect(() => {
    OperatorService.getOperatorFleetRoutes().then((r) => setFleetRoutes(r?.data ?? [])).catch(() => {});
  }, []);

  const handleCreate = async (payload) => {
    setSaving(true);
    setMsg('');
    try {
      await OperatorService.createShiftBlock(payload);
      setMsg('Shift block created.');
      setShowCreateModal(false);
      void loadBlocks();
    } catch (err) {
      setMsg(err?.message || 'Failed to create shift block.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (shiftBlockId) => {
    setMsg('');
    try {
      await OperatorService.cancelShiftBlock(shiftBlockId);
      setMsg('Shift block cancelled.');
      void loadBlocks();
    } catch (err) {
      setMsg(err?.message || 'Failed to cancel shift block.');
    }
  };

  const handleOverrideHandoff = async (shiftBlockId) => {
    setMsg('');
    try {
      await OperatorService.overrideShiftBlockHandoff(shiftBlockId);
      setMsg('Hand-off forced.');
      void loadBlocks();
    } catch (err) {
      setMsg(err?.message || 'Failed to force hand-off.');
    }
  };

  const handleMarkReviewed = async (shiftBlockId) => {
    setMsg('');
    try {
      await OperatorService.markShiftBlockReviewed(shiftBlockId);
      setMsg('Marked reviewed.');
      void loadBlocks();
    } catch (err) {
      setMsg(err?.message || 'Failed to mark reviewed.');
    }
  };

  return {
    blocks,
    blockCards,
    loading,
    showCreateModal, setShowCreateModal,
    saving,
    msg, setMsg,
    fleetRoutes,
    loadBlocks,
    handleCreate,
    handleCancel,
    handleOverrideHandoff,
    handleMarkReviewed,
  };
}
