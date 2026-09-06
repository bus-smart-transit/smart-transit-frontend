import { useCallback, useEffect, useRef, useState } from 'react';
import { Bus, Clock3, LocateFixed, MapPin, Navigation } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { loadMapLib } from '../../Map/mapDependencies';
import PassengerService from '../../../api/PassengerService/PassengerService';
import { haversineM } from '../../../utils/geo';
import { fetchTrafficStatus } from '../../../services/trafficService';

const POLL_MS = 12000;
const ROUTE_SOURCE_ID = 'public-track-route';
const ROUTE_LAYER_ID = 'public-track-route-line';
const ROUTE_GLOW_LAYER_ID = 'public-track-route-glow';

const toFiniteCoord = (lat, lng) => {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
  return [parsedLng, parsedLat];
};

const extractStopCoords = (stops = []) => stops
  .map((row) => toFiniteCoord(row?.latitude, row?.longitude))
  .filter(Boolean);

const toLineGeometry = (coordinates = []) => ({
  type: 'LineString',
  coordinates,
});

const fetchRoadPathFromOsrm = async (coordinates = []) => {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const encoded = coordinates.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${encoded}?overview=full&geometries=geojson&steps=false`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  const roadCoords = data?.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(roadCoords) || roadCoords.length < 2) return null;

  return roadCoords;
};

const deriveStopProgress = (stops = [], fleetLat, fleetLng, lastAcknowledgedStopId, tripStatus) => {
  const normalizedStops = (Array.isArray(stops) ? stops : [])
    .map((row) => {
      const stopLat = Number(row?.latitude);
      const stopLng = Number(row?.longitude);
      if (!Number.isFinite(stopLat) || !Number.isFinite(stopLng)) return null;
      return {
        ...row,
        latitude: stopLat,
        longitude: stopLng,
        stop_order: Number(row?.stop_order ?? 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.stop_order - b.stop_order);

  if (normalizedStops.length === 0) return null;

  const totalStops = normalizedStops.length;
  const normalizedTripStatus = String(tripStatus || '').toLowerCase();
  const acknowledgedId = Number(lastAcknowledgedStopId);

  let completedStops = 0;
  let nearestDistance = null;

  if (normalizedTripStatus === 'completed') {
    completedStops = totalStops;
  } else if (Number.isFinite(acknowledgedId) && acknowledgedId > 0) {
    const acknowledgedIndex = normalizedStops.findIndex((stop) => Number(stop?.stop_id) === acknowledgedId);
    if (acknowledgedIndex >= 0) {
      completedStops = acknowledgedIndex + 1;
    }
  }

  if (completedStops === 0) {
    const lat = Number(fleetLat);
    const lng = Number(fleetLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      let nearestIndex = 0;
      nearestDistance = Number.POSITIVE_INFINITY;

      normalizedStops.forEach((stop, idx) => {
        const distance = haversineM(lat, lng, stop.latitude, stop.longitude);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = idx;
        }
      });

      completedStops = Math.min(totalStops, nearestIndex + 1);
    }
  }

  completedStops = Math.max(0, Math.min(totalStops, completedStops));
  const progressPercent = totalStops > 1
    ? Math.round((Math.max(0, completedStops - 1) / (totalStops - 1)) * 100)
    : 0;
  const nextStop = completedStops >= totalStops
    ? normalizedStops[totalStops - 1]
    : normalizedStops[completedStops];

  return {
    completedStops,
    totalStops,
    progressPercent,
    nextStopName: nextStop?.stop_name || 'Final stop',
    nearestDistance,
  };
};

function formatDistance(meters) {
  if (!Number.isFinite(Number(meters))) return '-';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export default function PublicTrackingSection({ showHeader = true, compact = false }) {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapLibRef = useRef(null);
  const markersRef = useRef(new Map());
  const userMarkerRef = useRef(null);
  const routeGeometryCacheRef = useRef(new Map());

  const [fleets, setFleets] = useState([]);
  const [selectedFleetId, setSelectedFleetId] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [isPinning, setIsPinning] = useState(false);
  const [pinError, setPinError] = useState('');
  const [etaState, setEtaState] = useState({ label: 'Waiting for selected bus', etaMinutes: null });
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [selectedRouteStops, setSelectedRouteStops] = useState([]);
  const [routeProgress, setRouteProgress] = useState(null);

  const selectedFleet = fleets.find((row) => Number(row?.fleet_id) === Number(selectedFleetId)) || fleets[0] || null;

  const clearRoutePath = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
    if (map.getLayer(ROUTE_GLOW_LAYER_ID)) map.removeLayer(ROUTE_GLOW_LAYER_ID);
    if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
  }, []);

  const drawRoutePath = useCallback((geometry) => {
    const map = mapRef.current;
    if (!map || !geometry || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) return;

    const featureCollection = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry,
      }],
    };

    const existingSource = map.getSource(ROUTE_SOURCE_ID);
    if (existingSource) {
      existingSource.setData(featureCollection);
      return;
    }

    map.addSource(ROUTE_SOURCE_ID, {
      type: 'geojson',
      data: featureCollection,
    });

    map.addLayer({
      id: ROUTE_GLOW_LAYER_ID,
      type: 'line',
      source: ROUTE_SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#22d3ee',
        'line-width': 10,
        'line-opacity': 0.25,
      },
    });

    map.addLayer({
      id: ROUTE_LAYER_ID,
      type: 'line',
      source: ROUTE_SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#0ea5e9',
        'line-width': 5,
        'line-opacity': 0.85,
      },
    });
  }, []);

  const flyToFleet = useCallback((row) => {
    const map = mapRef.current;
    if (!map) return;
    const lat = Number(row?.latitude);
    const lng = Number(row?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.flyTo({ center: [lng, lat], zoom: 14, speed: 1.1 });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { default: maplibregl } = await loadMapLib();
      if (cancelled || mapRef.current || !mapContainerRef.current) return;
      mapLibRef.current = maplibregl;
      mapRef.current = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: [125.6047, 7.0707],
        zoom: 12,
      });
    };

    void init();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (mapRef.current) {
        clearRoutePath();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [clearRoutePath]);

  const refreshFleets = useCallback(async (manual = false) => {
    const map = mapRef.current;
    const maplibregl = mapLibRef.current;
    if (!map || !maplibregl) return;

    try {
      const res = await PassengerService.getFleetLocations();
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
        const lat = Number(row.latitude);
        const lng = Number(row.longitude);
        const title = row?.plate_number || `Fleet ${fleetId}`;

        if (!markersRef.current.has(fleetId)) {
          const el = document.createElement('div');
          el.className = 'public-fleet-marker';
          el.innerHTML = '🚌';
          el.addEventListener('click', () => {
            setSelectedFleetId(fleetId);
            flyToFleet(row);
          });

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([lng, lat])
            .setPopup(
              new maplibregl.Popup({ offset: 18 }).setHTML(
                `<div style="font-family:sans-serif;color:#0f172a;min-width:145px;padding:6px;">
                  <p style="margin:0;font-weight:700;font-size:12px;">${title}</p>
                  <p style="margin:2px 0 0;font-size:11px;color:#475569;text-transform:capitalize;">${row?.trip_status || 'active'}</p>
                  <p style="margin:2px 0 0;font-size:11px;color:#0f766e;">Type: ${row?.fleet_type || 'unknown'}</p>
                </div>`,
              ),
            )
            .addTo(map);

          markersRef.current.set(fleetId, marker);
        } else {
          markersRef.current.get(fleetId)?.setLngLat([lng, lat]);
        }
      });

      for (const [fleetId, marker] of markersRef.current) {
        if (!activeIds.has(fleetId)) {
          marker.remove();
          markersRef.current.delete(fleetId);
        }
      }

      if (rows.length > 0 && (!selectedFleetId || !rows.some((row) => Number(row?.fleet_id) === Number(selectedFleetId)))) {
        const first = Number(rows[0].fleet_id);
        setSelectedFleetId(first);
        flyToFleet(rows[0]);
      }
    } catch {
      // Keep the section resilient to transient polling failures.
    }
  }, [flyToFleet, selectedFleetId]);

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
    void refreshFleets(true);
  };

  useEffect(() => {
    if (!userCoords || !selectedFleet) {
      setEtaState({ label: 'Pin your location to compute ETA', etaMinutes: null });
      return;
    }

    let cancelled = false;
    void (async () => {
      const status = await fetchTrafficStatus({
        currentLat: userCoords.lat,
        currentLng: userCoords.lng,
        nextStop: {
          latitude: Number(selectedFleet.latitude),
          longitude: Number(selectedFleet.longitude),
        },
        route: {
          route_name: selectedFleet?.route_name,
          origin: selectedFleet?.origin,
          destination: selectedFleet?.destination,
        },
      });

      if (!cancelled) {
        setEtaState({ label: status.label, etaMinutes: status.etaMinutes });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedFleet, userCoords]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const routeId = Number(selectedFleet?.route_id);
    if (!Number.isFinite(routeId) || routeId <= 0) {
      clearRoutePath();
      setSelectedRouteStops([]);
      return;
    }

    let cancelled = false;

    const drawAssignedRoute = async () => {
      const cached = routeGeometryCacheRef.current.get(routeId);
      if (cached) {
        setSelectedRouteStops(cached.stops || []);
        drawRoutePath(cached.geometry);
        return;
      }

      try {
        const stopsRes = await PassengerService.getRouteStops(routeId);
        const stops = Array.isArray(stopsRes?.data) ? stopsRes.data : [];
        const stopCoords = extractStopCoords(stops);
        if (stopCoords.length < 2) {
          clearRoutePath();
          return;
        }

        let geometry = toLineGeometry(stopCoords);
        try {
          const roadCoords = await fetchRoadPathFromOsrm(stopCoords);
          if (roadCoords && roadCoords.length >= 2) {
            geometry = toLineGeometry(roadCoords);
          }
        } catch {
          // Stop-to-stop geometry remains as fallback when road routing fails.
        }

        routeGeometryCacheRef.current.set(routeId, { geometry, stops });
        if (!cancelled) {
          setSelectedRouteStops(stops);
          drawRoutePath(geometry);
        }
      } catch {
        if (!cancelled) {
          clearRoutePath();
          setSelectedRouteStops([]);
        }
      }
    };

    void drawAssignedRoute();

    return () => {
      cancelled = true;
    };
  }, [clearRoutePath, drawRoutePath, selectedFleet?.route_id]);

  useEffect(() => {
    if (!selectedFleet || selectedRouteStops.length < 2) {
      setRouteProgress(null);
      return;
    }

    const progress = deriveStopProgress(
      selectedRouteStops,
      selectedFleet.latitude,
      selectedFleet.longitude,
      selectedFleet.last_acknowledged_stop_id,
      selectedFleet.trip_status,
    );
    setRouteProgress(progress);
  }, [selectedFleet, selectedRouteStops]);

  const handlePinLocation = () => {
    if (!navigator.geolocation) {
      setPinError('Geolocation is not supported in this browser.');
      return;
    }

    const map = mapRef.current;
    const maplibregl = mapLibRef.current;
    if (!map || !maplibregl) {
      setPinError('Map is still loading. Please try again.');
      return;
    }

    setPinError('');
    setIsPinning(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);

        setUserCoords({ lat, lng });

        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
        }

        const markerEl = document.createElement('div');
        markerEl.className = 'public-user-marker';
        markerEl.innerHTML = '📍';

        userMarkerRef.current = new maplibregl.Marker({ element: markerEl })
          .setLngLat([lng, lat])
          .setPopup(
            new maplibregl.Popup({ offset: 14 }).setHTML(
              '<div style="font-family:sans-serif;color:#0f172a;padding:6px;">Your current location</div>',
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

  return (
    <section className={compact ? 'bg-transparent px-0 py-0' : 'bg-white px-4 py-12 sm:px-6 lg:px-10'}>
      <div className="mx-auto max-w-7xl space-y-5">
        {showHeader && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">Public Live Tracking</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-slate-900 sm:text-4xl">Track buses without an account</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">See current location, estimated arrival, and fleet type in real time before you sign in.</p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">Track Bus</p>
                <h3 className="text-lg font-semibold text-slate-900">{selectedFleet?.plate_number || 'No active bus detected'}</h3>
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

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div ref={mapContainerRef} className="h-90 w-full" />
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] uppercase tracking-widest text-slate-500">ETA</p>
                <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-900"><Clock3 className="h-3.5 w-3.5 text-teal-600" />{etaState.etaMinutes == null ? 'N/A' : `${etaState.etaMinutes} min`}</p>
                <p className="text-[11px] text-slate-500">{etaState.label}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] uppercase tracking-widest text-slate-500">Location</p>
                <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-900"><MapPin className="h-3.5 w-3.5 text-teal-600" />{selectedFleet ? `${Number(selectedFleet.latitude).toFixed(4)}, ${Number(selectedFleet.longitude).toFixed(4)}` : 'N/A'}</p>
                <p className="text-[11px] text-slate-500 capitalize">{selectedFleet?.trip_status || 'idle'}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] uppercase tracking-widest text-slate-500">Next Stop</p>
                <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-900"><Navigation className="h-3.5 w-3.5 text-teal-600" />{nextStopOrDestinationLabel}</p>
                <p className="text-[11px] text-slate-500">{selectedFleet?.route_name || selectedFleet?.destination || 'Route sync pending'}</p>
              </div>
            </div>
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

          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">Active Buses</p>
                <h3 className="text-lg font-semibold text-slate-900">Choose a bus to focus</h3>
              </div>
              <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700">{fleets.length} live</span>
            </div>

            <div className="max-h-114.5 space-y-2 overflow-y-auto pr-1">
              {fleetsWithDistance.length === 0 && (
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
              {fleetsWithDistance.map((row) => {
                const isSelected = Number(selectedFleetId) === Number(row?.fleet_id);
                return (
                  <button
                    key={row?.fleet_id}
                    type="button"
                    onClick={() => {
                      setSelectedFleetId(Number(row.fleet_id));
                      flyToFleet(row);
                    }}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${isSelected ? 'border-teal-400 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-200'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900">{row?.plate_number || `Fleet ${row?.fleet_id}`}</p>
                      <span className="inline-flex max-w-48 items-center gap-1 truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        <Bus className="h-3 w-3" />
                        {row?.destination || row?.route_name || 'Destination pending'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs capitalize text-slate-600">{row?.trip_status || 'active'} • {formatDistance(row?._distanceM)}</p>
                    <p className="mt-1 text-xs text-slate-500">{Number(row?.latitude).toFixed(4)}, {Number(row?.longitude).toFixed(4)}</p>
                  </button>
                );
              })}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
