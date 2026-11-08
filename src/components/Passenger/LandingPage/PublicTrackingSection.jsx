import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bus, Clock3, LocateFixed, MapPin, Navigation } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import RouteMap from '../../Map/RouteMap';
import { fetchFleetLocationsForMap } from '../../../api/hooks/Passenger/useMapView';
import { haversineM } from '../../../utils/geo';
import { describeBusPlace } from '../../../utils/busPlace';
import { fetchRouteMapData } from '../../../services/routeMapService';
import { getTripTimeline } from '../../../services/bookingService';
import { busEtaSummary, etaMinutesLabel } from '../../../utils/busEta';
import { BUS_COLORS, createBusMarkerElement, createYouAreHereElement } from '../../Map/mapMarkers';

// 2026-10-29: the bus icon's colour from the trip status (delayed in amber).
const busColorFor = (row) => (String(row?.trip_status || '').toLowerCase() === 'delayed' ? BUS_COLORS.warning : BUS_COLORS.live);
const headingOf = (row) => (Number.isFinite(Number(row?.heading)) && row?.heading !== null ? Number(row.heading) : null);
import { busLabelText } from '../../../utils/busLabel';
import { useRegion } from '../../../api/hooks/useRegion';
import { busArrival, busesNear, busTrip, formatKm, passengersText } from '../../../utils/nearbyBuses';
import TrackMyBusModal from '../Track/TrackMyBusModal';

const POLL_MS = 12000;

// The stops of a bus's route, ordered for its leg direction, are what name its place.
const routeKeyOf = (row) => `${Number(row?.route_id)}:${row?.leg_direction === 'reverse' ? 'reverse' : 'outbound'}`;

// Popup content is built with DOM nodes (never HTML strings) so plate numbers
// and other operator-entered text cannot inject markup.
const buildFleetPopup = (title, status, fleetType) => {
  const root = document.createElement('div');
  root.style.cssText = 'font-family:sans-serif;color:#0f172a;min-width:145px;padding:6px;';
  const rows = [
    [title, 'margin:0;font-weight:700;font-size:12px;'],
    [status, 'margin:2px 0 0;font-size:11px;color:#475569;text-transform:capitalize;'],
    ['Type: ' + fleetType, 'margin:2px 0 0;font-size:11px;color:#0f766e;'],
  ];
  rows.forEach(([text, css]) => {
    const p = document.createElement('p');
    p.style.cssText = css;
    p.textContent = text;
    root.appendChild(p);
  });
  return root;
};

export default function PublicTrackingSection({ showHeader = true, compact = false, activeTicket = null }) {
  const mapRef = useRef(null);
  const mapLibRef = useRef(null);
  const markersRef = useRef(new Map());
  const userMarkerRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [fleets, setFleets] = useState([]);
  const [selectedFleetId, setSelectedFleetId] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [isPinning, setIsPinning] = useState(false);
  const [pinError, setPinError] = useState('');
  // 2026-10-29: the ETA follows the bus (its trip timeline), not the passenger's pin.
  const [timeline, setTimeline] = useState({ tripId: null, data: null, error: '' });
  const [nowMs, setNowMs] = useState(() => Date.now());
  const busIconsRef = useRef(new Map());
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [selectedRouteStops, setSelectedRouteStops] = useState([]);
  const [stopsByRoute, setStopsByRoute] = useState({});
  const requestedRoutesRef = useRef(new Set());
  // Batch 45 Feature C: "Buses near you" (radius from the server's region settings) and the "Track my bus" pop-up.
  const region = useRegion();
  const radiusKm = region?.nearbyRadiusKm ?? null;
  const [trackOpen, setTrackOpen] = useState(false);
  const [showAllBuses, setShowAllBuses] = useState(false);

  // Batch 50 (user, 2026-11-08): no bus is chosen at first; every bus shows on the map. Choosing one focuses on it
  // alone (its route, ETA, location and next stop) until "Show all buses".
  const selectedFleet = fleets.find((row) => Number(row?.fleet_id) === Number(selectedFleetId)) || null;

  const selectedRouteId = Number(selectedFleet?.route_id) > 0 ? Number(selectedFleet.route_id) : null;

  // Dim everything outside the passenger's boarding-to-alighting journey, only
  // when the ticket belongs to the route currently shown.
  const ticketHighlight = useMemo(() => {
    const ticketRoute = activeTicket?.trip?.fleet_route?.route?.route_id
      ?? activeTicket?.trip?.fleetRoute?.route?.route_id
      ?? activeTicket?.trip?.fleet_route?.route_id
      ?? activeTicket?.trip?.fleetRoute?.route_id;
    if (!activeTicket || !selectedRouteId || Number(ticketRoute) !== selectedRouteId) return null;
    if (!activeTicket.origin_stop_id || !activeTicket.destination_stop_id) return null;
    return { fromStopId: activeTicket.origin_stop_id, toStopId: activeTicket.destination_stop_id };
  }, [activeTicket, selectedRouteId]);

  const flyToFleet = useCallback((row) => {
    const map = mapRef.current;
    if (!map) return;
    const lat = Number(row?.latitude);
    const lng = Number(row?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.flyTo({ center: [lng, lat], zoom: 14, speed: 1.1 });
  }, []);

  // The shared RouteMap owns the map instance; this component only adds its
  // own overlays (live bus markers, the passenger's pinned location) on top.
  const handleMapReady = useCallback((map, maplibregl) => {
    mapRef.current = map;
    mapLibRef.current = maplibregl;
    setMapReady(true);
  }, []);

  const handleRouteData = useCallback((data) => {
    setSelectedRouteStops((data?.stops || []).map((stop) => ({
      stop_id: stop.stopId,
      stop_name: stop.name,
      stop_order: stop.sequence,
      latitude: stop.latitude,
      longitude: stop.longitude,
    })));
  }, []);

  useEffect(() => {
    const markers = markersRef.current;
    return () => {
      markers.forEach((marker) => marker.remove());
      markers.clear();
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
  }, []);

  const refreshFleets = useCallback(async () => {
    const map = mapRef.current;
    const maplibregl = mapLibRef.current;
    if (!mapReady || !map || !maplibregl) return;

    try {
      const res = await fetchFleetLocationsForMap();
      const rows = (res?.data ?? []).filter(
        (row) => Number.isFinite(Number(row?.latitude)) && Number.isFinite(Number(row?.longitude)),
      );
      setFleets(rows);

      if (rows.length === 0) {
        setSelectedFleetId(null);
      } else {
        setPollingEnabled(true);
      }

      const activeIds = new Set(rows.map((row) => Number(row.fleet_id)));

      rows.forEach((row) => {
        const fleetId = Number(row.fleet_id);
        // Server-projected position keeps the bus on the route line; a bus that
        // is genuinely off route is shown where it really is.
        const projected = row?.route_position?.on_route ? row.route_position : null;
        const lat = Number(projected ? projected.snapped_latitude : row.latitude);
        const lng = Number(projected ? projected.snapped_longitude : row.longitude);
        // Batch 49 item 4: a bus moved by the Super Admin's GPS simulator says so.
        const title = `${busLabelText(row?.bus_label)}${row?.is_simulated ? ' (Simulated)' : ''}`;

        if (!markersRef.current.has(fleetId)) {
          const icon = createBusMarkerElement({ color: busColorFor(row), heading: headingOf(row), title });
          const el = icon.element;
          busIconsRef.current.set(fleetId, icon);
          el.addEventListener('click', () => {
            setSelectedFleetId(fleetId);
            flyToFleet(row);
          });

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .setPopup(
              new maplibregl.Popup({ offset: 18 }).setDOMContent(
                buildFleetPopup(title, row?.trip_status || 'active', row?.fleet_type || 'unknown'),
              ),
            )
            .addTo(map);

          markersRef.current.set(fleetId, marker);
        } else {
          markersRef.current.get(fleetId)?.setLngLat([lng, lat]);
          busIconsRef.current.get(fleetId)?.setColor(busColorFor(row));
          busIconsRef.current.get(fleetId)?.setHeading(headingOf(row));
        }
      });

      for (const [fleetId, marker] of markersRef.current) {
        if (!activeIds.has(fleetId)) {
          marker.remove();
          markersRef.current.delete(fleetId);
          busIconsRef.current.delete(fleetId);
        }
      }

      // The chosen bus finished its trip (it left the list): back to all buses.
      if (selectedFleetId && !rows.some((row) => Number(row?.fleet_id) === Number(selectedFleetId))) {
        setSelectedFleetId(null);
      }
    } catch {
      // Keep the section resilient to transient polling failures.
    }
  }, [flyToFleet, selectedFleetId, mapReady]);

  useEffect(() => {
    if (!pollingEnabled) return undefined;

    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await refreshFleets();
    };

    void tick();
    const id = setInterval(() => {
      void tick();
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollingEnabled, refreshFleets]);

  const handleRetryFleetFetch = () => {
    setPollingEnabled(true);
    void refreshFleets();
  };

  // Load the stops of every live bus's route once, so each bus can be placed by stop name instead of coordinates.
  useEffect(() => {
    const wanted = new Map();
    fleets.forEach((row) => {
      if (Number(row?.route_id) > 0) wanted.set(routeKeyOf(row), row);
    });
    const missing = [...wanted.entries()].filter(([key]) => !requestedRoutesRef.current.has(key));
    if (missing.length === 0) return undefined;

    const timer = setTimeout(() => {
      missing.forEach(([key, row]) => {
        requestedRoutesRef.current.add(key);
        fetchRouteMapData(Number(row.route_id), row.leg_direction === 'reverse' ? 'reverse' : 'outbound')
          .then((data) => setStopsByRoute((prev) => ({ ...prev, [key]: data.stops })))
          .catch(() => requestedRoutesRef.current.delete(key));
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [fleets]);

  const placeLabel = (row) => {
    if (!(Number(row?.route_id) > 0)) return 'On the road (route not available)';
    const stops = stopsByRoute[routeKeyOf(row)];
    if (!stops) return 'Finding the bus location...';
    return describeBusPlace(stops, row.latitude, row.longitude)?.text ?? 'On the road';
  };
  const coordinatesTitle = (row) => `${Number(row?.latitude).toFixed(5)}, ${Number(row?.longitude).toFixed(5)}`;

  // Only the chosen bus is drawn while one is chosen; with none, every bus, and the map fits them all.
  useEffect(() => {
    for (const [fleetId, marker] of markersRef.current) {
      const el = marker.getElement?.();
      if (el) el.style.display = selectedFleetId && Number(fleetId) !== Number(selectedFleetId) ? 'none' : '';
    }
    const map = mapRef.current;
    const maplibregl = mapLibRef.current;
    if (!selectedFleetId && map && maplibregl && fleets.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      fleets.forEach((row) => bounds.extend([Number(row.longitude), Number(row.latitude)]));
      try { map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 600 }); } catch { /* map not ready */ }
    }
  }, [selectedFleetId, fleets]);
  const showAll = useCallback(() => setSelectedFleetId(null), []);

  const selectedTripId = Number(selectedFleet?.trip_id) > 0 ? Number(selectedFleet.trip_id) : null;
  useEffect(() => {
    if (!selectedTripId) return undefined;
    let cancelled = false;
    const load = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      try {
        const data = await getTripTimeline(selectedTripId);
        if (!cancelled) setTimeline({ tripId: selectedTripId, data, error: '' });
      } catch {
        if (!cancelled) setTimeline((prev) => ({ tripId: selectedTripId, data: prev.tripId === selectedTripId ? prev.data : null, error: 'Arrival times are not available right now.' }));
      }
      if (!cancelled) setNowMs(Date.now());
    };
    void load();
    // Batch 50: the ETA follows the live position, so it is asked for again every 20 seconds while a bus is watched.
    const id = setInterval(load, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, [selectedTripId]);

  // The stop nearest the passenger's pinned position, on the selected bus's route.
  const nearStopId = useMemo(() => {
    if (!userCoords || !selectedFleet) return null;
    const stops = stopsByRoute[routeKeyOf(selectedFleet)] || [];
    let best = null;
    let bestM = Number.POSITIVE_INFINITY;
    stops.forEach((stop) => {
      const m = haversineM(userCoords.lat, userCoords.lng, Number(stop.latitude), Number(stop.longitude));
      if (Number.isFinite(m) && m < bestM) { bestM = m; best = stop; }
    });
    return best?.stopId ?? best?.stop_id ?? null; // route map stops carry stopId
  }, [userCoords, selectedFleet, stopsByRoute]);

  const eta = useMemo(
    () => (timeline.tripId === selectedTripId ? busEtaSummary(timeline.data, nowMs, nearStopId) : null),
    [timeline, selectedTripId, nowMs, nearStopId],
  );

  // Batch 50: the stops passed come from the server (the bus position and the Driver's taps, one owner), so the map's
  // gray stops, the progress bar and the next stop always agree with the ETA.
  const passedStopIds = useMemo(() => (selectedFleet?.trip_progress?.passed_stop_ids || []).map(Number), [selectedFleet]);
  const routeProgress = useMemo(() => {
    if (!selectedFleet || selectedRouteStops.length < 2) return null;
    const progress = selectedFleet.trip_progress || {};
    const total = selectedRouteStops.length;
    const passed = progress.arrived ? total : Math.min(total, passedStopIds.length);
    return {
      completedStops: passed,
      totalStops: total,
      progressPercent: total > 1 ? Math.round((Math.max(0, passed - 1) / (total - 1)) * 100) : 0,
      nextStopName: progress.arrived ? `Arrived at ${progress.destination || 'the last stop'}` : (progress.next_stop || 'Not provided'),
    };
  }, [selectedFleet, selectedRouteStops, passedStopIds]);
  const selectedTrip = busTrip(selectedFleet?.trip_progress);

  const handlePinLocation = () => {
    if (!navigator.geolocation) {
      setPinError('Geolocation is not supported in this browser.');
      return;
    }

    setPinError('');
    setIsPinning(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);

        // Batch 45 Feature C: the "Buses near you" list needs only the location, not the map, so a slow map (or a
        // phone that is still drawing it) no longer blocks it. The "you are here" marker is added when the map is ready.
        setUserCoords({ lat, lng });
        const map = mapRef.current;
        const maplibregl = mapLibRef.current;
        if (!map || !maplibregl) {
          setIsPinning(false);
          return;
        }

        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
        }

        userMarkerRef.current = new maplibregl.Marker({ element: createYouAreHereElement(), anchor: 'bottom' })
          .setLngLat([lng, lat])
          .setPopup(
            new maplibregl.Popup({ offset: 14 }).setDOMContent(
              Object.assign(document.createElement('div'), { textContent: 'Your current location' }),
            ),
          )
          .addTo(map);

        map.flyTo({ center: [lng, lat], zoom: 14, speed: 1.1 });
        setIsPinning(false);
      },
      (error) => {
        const code = Number(error?.code);
        if (code === 1) setPinError('Location access denied. Please allow location permissions.');
        else if (code === 2) setPinError('Location unavailable right now.');
        else if (code === 3) setPinError('Location request timed out. Try again.');
        else setPinError('Unable to pin your location right now.');
        setIsPinning(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const fleetsWithDistance = [...fleets]
    .map((row) => {
      const lat = Number(row?.latitude);
      const lng = Number(row?.longitude);
      const distanceM = userCoords && Number.isFinite(lat) && Number.isFinite(lng)
        ? haversineM(userCoords.lat, userCoords.lng, lat, lng)
        : null;
      return { ...row, _distanceM: distanceM };
    })
    .sort((a, b) => {
      if (a._distanceM == null) return 1;
      if (b._distanceM == null) return -1;
      return a._distanceM - b._distanceM;
    });

  const nextStopOrDestinationLabel = routeProgress?.nextStopName || selectedFleet?.destination || 'Route sync pending';

  // Batch 45 Feature C: with the passenger's pinned location, the panel lists only buses within radiusKm (measured on
  // this device); "Show all" or a missing radius falls back to every running bus.
  const nearby = busesNear(fleets, userCoords, radiusKm);
  const nearbyMode = Boolean(userCoords && radiusKm && !showAllBuses);

  return (
    <section className={compact ? 'bg-transparent px-0 py-0' : 'bg-white px-4 py-12 sm:px-6 lg:px-10'}>
      <div className="mx-auto max-w-7xl space-y-5">
        {showHeader && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">Public Live Tracking</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-slate-900 sm:text-4xl">Track buses without an account</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">See current location, estimated arrival, and active destination/next stop in real time before you sign in.</p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">Track Bus</p>
                <h3 className="text-lg font-semibold text-slate-900">{selectedFleet ? busLabelText(selectedFleet.bus_label) : fleets.length > 0 ? `${fleets.length} bus${fleets.length === 1 ? '' : 'es'} on the road` : 'No active bus detected'}{selectedFleet?.is_simulated && <span data-testid="simulated-chip" className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 align-middle text-xs font-semibold text-amber-800">Simulated</span>}</h3>
                {selectedFleet && (
                  <button type="button" onClick={showAll} data-testid="show-all-buses" className="mt-1 inline-flex min-h-9 items-center text-xs font-semibold text-teal-700 underline">Show all buses</button>
                )}
              </div>
              <button
                type="button"
                onClick={handlePinLocation}
                disabled={isPinning}
                className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-50 disabled:opacity-60"
              >
                <LocateFixed className="h-3.5 w-3.5" />
                {isPinning ? 'Pinning...' : 'Pin My Location'}
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <RouteMap
                routeId={selectedRouteId}
                direction={selectedFleet?.leg_direction || 'outbound'}
                highlight={ticketHighlight}
                acknowledgedStopIds={passedStopIds}
                showStatus={false}
                onMapReady={handleMapReady}
                onRouteData={handleRouteData}
                className="relative h-90 w-full"
              />
            </div>

            {!selectedFleet && fleets.length > 0 && (
              <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600" data-testid="choose-a-bus">
                Choose a bus on the map or in the list to see when it arrives, where it is and its next stop.
              </p>
            )}
            {selectedFleet && (
            <div className="mt-3 grid gap-2 sm:grid-cols-3" data-testid="bus-live-panels">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] uppercase tracking-widest text-slate-500">ETA</p>
                {!selectedFleet ? (
                  <p className="mt-1 text-sm text-slate-500">No bus selected</p>
                ) : !eta ? (
                  <p className="mt-1 text-sm text-slate-500" data-testid="eta-unavailable">{timeline.error || (selectedTripId ? 'Working out arrival times...' : 'Not provided')}</p>
                ) : eta.finished ? (
                  <p className="mt-1 text-sm font-semibold text-slate-900" data-testid="eta-arrived">Arrived at its final destination, {eta.destination?.name || 'the last stop'}</p>
                ) : (
                  <div data-testid="eta-next">
                    <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
                      <Clock3 className="h-3.5 w-3.5 text-teal-600" />
                      {eta.next.time ? `Arriving at ${eta.next.name} ${etaMinutesLabel(eta.next.minutes)}` : `Next: ${eta.next.name}`}
                    </p>
                    <p className="text-[11px] text-slate-500">{eta.next.time ? `${eta.next.time}${eta.next.live ? ' · live estimate' : ' · scheduled'}` : 'Arrival time: Not provided'}</p>
                    {eta.destination.time && <p className="text-[11px] text-slate-500">Destination {eta.destination.name} {eta.destination.time}{eta.destination.live ? ' · live estimate' : ''}</p>}
                    {eta.nearYou && (
                      <p className="mt-1 text-[11px] font-semibold text-teal-700" data-testid="eta-near-you">
                        {eta.nearYou.passed
                          ? `The bus has passed ${eta.nearYou.name}, the stop near you`
                          : `Near you: ${eta.nearYou.name}${eta.nearYou.time ? ` ${eta.nearYou.time} ${etaMinutesLabel(eta.nearYou.minutes)}` : ''}`}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] uppercase tracking-widest text-slate-500">Location</p>
                <p className="mt-1 flex items-start gap-1 text-sm font-semibold text-slate-900" title={selectedFleet ? coordinatesTitle(selectedFleet) : undefined}><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" /><span>{selectedFleet ? placeLabel(selectedFleet) : 'N/A'}</span></p>
                <p className="text-[11px] text-slate-500">{selectedTrip.arrived ? 'Arrived' : selectedTrip.departedAt ? `Departed at ${selectedTrip.departedAt}` : <span className="capitalize">{selectedFleet?.trip_status || 'idle'}</span>}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] uppercase tracking-widest text-slate-500">Next Stop / Destination</p>
                <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-900"><Navigation className="h-3.5 w-3.5 text-teal-600" />{selectedTrip.arrived ? `Arrived at ${selectedTrip.destination}` : (selectedFleet?.trip_progress?.next_stop || nextStopOrDestinationLabel)}</p>
                <p className="text-[11px] text-slate-500">{selectedTrip.destination ? `Destination: ${selectedTrip.destination}` : (selectedFleet?.route_name || 'Route sync pending')}</p>
              </div>
            </div>
            )}
            {routeProgress && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-widest text-slate-500">Route Progress</p>
                  <p className="text-xs font-semibold text-slate-700">{routeProgress.completedStops}/{routeProgress.totalStops} stops</p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-cyan-400 to-sky-500"
                    style={{ width: `${Math.max(0, Math.min(100, routeProgress.progressPercent))}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-600">Next stop: <span className="font-semibold text-slate-800">{routeProgress.nextStopName}</span></p>
              </div>
            )}
            {pinError && <p className="mt-2 text-xs font-medium text-red-600">{pinError}</p>}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5" data-testid="nearby-panel">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">{nearbyMode ? 'Buses near you' : 'Active Buses'}</p>
                <h3 className="text-lg font-semibold text-slate-900">
                  {nearbyMode ? `Within ${radiusKm} km of you` : 'Choose a bus to focus'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700">
                  {nearbyMode ? `${nearby.length} near` : `${fleets.length} live`}
                </span>
                <button
                  type="button"
                  onClick={() => setTrackOpen(true)}
                  className="rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-900"
                  data-testid="open-track-my-bus"
                >
                  Track my bus
                </button>
              </div>
            </div>

            {!userCoords && (
              <p className="mb-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600" data-testid="nearby-needs-location">
                Tap <span className="font-semibold">Pin My Location</span> to see the buses within {radiusKm ?? 5} km of you. Your location stays on this device.
              </p>
            )}
            {nearbyMode && nearby.length === 0 && (
              <div className="mb-2 rounded-lg border border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-500" data-testid="nearby-none">
                <p>No running buses within {radiusKm} km of you right now.</p>
                {fleets.length > 0 && (
                  <button type="button" onClick={() => setShowAllBuses(true)} className="mt-2 text-xs font-semibold text-teal-700 underline">
                    Show all {fleets.length} running buses
                  </button>
                )}
              </div>
            )}

            <div className="max-h-114.5 space-y-2 overflow-y-auto pr-1">
              {!nearbyMode && fleetsWithDistance.length === 0 && (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-500">
                  <p>No active buses right now.</p>
                  {!pollingEnabled && (
                    <button
                      type="button"
                      onClick={handleRetryFleetFetch}
                      className="mt-3 rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                    >
                      Check again
                    </button>
                  )}
                </div>
              )}
              {(nearbyMode ? nearby : fleetsWithDistance).map((row) => {
                const isSelected = Number(selectedFleetId) === Number(row?.fleet_id);
                const arrival = busArrival(row?.trip_progress);
                const trip = busTrip(row?.trip_progress);
                return (
                  <button
                    key={row?.fleet_id}
                    type="button"
                    data-testid="bus-choice"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedFleetId(Number(row.fleet_id));
                      flyToFleet(row);
                    }}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${isSelected ? 'border-teal-400 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-200'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900">{busLabelText(row?.bus_label)}{row?.is_simulated && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">Simulated</span>}</p>
                      <span className="inline-flex max-w-48 items-center gap-1 truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        <Bus className="h-3 w-3" />
                        {row?.destination || row?.route_name || 'Destination pending'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{trip.arrived ? 'Arrived' : trip.departedAt ? `Departed at ${trip.departedAt}` : <span className="capitalize">{row?.trip_status || 'active'}</span>}{nearbyMode ? ` • ${formatKm(row?._distanceM)}` : ''}</p>
                    <p className="mt-1 text-xs text-slate-500" title={coordinatesTitle(row)}>{placeLabel(row)}</p>
                    {/* Batch 50 (user): departed at, destination, when it arrives there, passengers on board. */}
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs" data-testid="nearby-bus-details">
                      <dt className="text-slate-500">Destination</dt>
                      <dd className="text-right font-semibold text-slate-800">{trip.destination || 'Not provided'}</dd>
                      <dt className="text-slate-500">Arrives</dt>
                      <dd className="text-right font-semibold text-slate-800" data-testid="nearby-bus-arrives">
                        {trip.arrived ? 'Arrived' : trip.arrives ? `${trip.arrives.time} · ${trip.arrives.basis}` : 'Not provided'}
                        {!trip.arrived && arrival.delay && <span className="block font-normal text-slate-500">{arrival.delay}</span>}
                      </dd>
                      <dt className="text-slate-500">Passengers</dt>
                      <dd className="text-right font-semibold text-slate-800" data-testid="nearby-bus-passengers">{passengersText(row?.trip_progress)}</dd>
                    </dl>
                    {arrival.note && <p className="mt-1 text-[11px] text-amber-700">{arrival.note}</p>}
                  </button>
                );
              })}
            </div>
          </article>
        </div>
      </div>
      <TrackMyBusModal open={trackOpen} onClose={() => setTrackOpen(false)} />
    </section>
  );
}
