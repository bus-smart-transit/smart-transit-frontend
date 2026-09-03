import { useCallback, useEffect, useRef, useState } from 'react';
import { Bus, Clock3, LocateFixed, MapPin, Navigation } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { loadMapLib } from '../../Map/mapDependencies';
import PassengerService from '../../../api/PassengerService/PassengerService';
import { haversineM } from '../../../utils/geo';
import { fetchTrafficStatus } from '../../../services/trafficService';

const POLL_MS = 12000;

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

  const [fleets, setFleets] = useState([]);
  const [selectedFleetId, setSelectedFleetId] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [isPinning, setIsPinning] = useState(false);
  const [pinError, setPinError] = useState('');
  const [etaState, setEtaState] = useState({ label: 'Waiting for selected bus', etaMinutes: null });
  const [pollingEnabled, setPollingEnabled] = useState(true);

  const selectedFleet = fleets.find((row) => Number(row?.fleet_id) === Number(selectedFleetId)) || fleets[0] || null;

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
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

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
        if (!manual) {
          setPollingEnabled(false);
        }
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
      });

      if (!cancelled) {
        setEtaState({ label: status.label, etaMinutes: status.etaMinutes });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedFleet, userCoords]);

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
                <p className="text-[11px] uppercase tracking-widest text-slate-500">Fleet Type</p>
                <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-900"><Navigation className="h-3.5 w-3.5 text-teal-600" />{selectedFleet?.fleet_type || 'Unknown'}</p>
                <p className="text-[11px] text-slate-500">{selectedFleet?.route_name || 'Route sync pending'}</p>
              </div>
            </div>
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
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-700">
                        <Bus className="h-3 w-3" />
                        {row?.fleet_type || 'Unknown'}
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
