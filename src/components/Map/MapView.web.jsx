import { useState, useEffect, useRef, useCallback } from "react";
import { Bus, Clock3, LocateFixed, MapPin, Route, Ruler, X } from 'lucide-react';
import "maplibre-gl/dist/maplibre-gl.css";
import { loadMapLib } from './mapDependencies';
import PassengerService from '../../api/PassengerService/PassengerService';
import { haversineM, lerp, lerpAngle } from '../../utils/geo';
import { Navigation } from 'lucide-react';
import { fetchTrafficStatus } from '../../services/trafficService';

export default function MapView({ role = "passenger", trackedFleetId = null }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const mapLibRef = useRef(null);
  const currentMarker = useRef(null);
  const destinationMarker = useRef(null);
  // fleet_id → { marker: MapLibre.Marker, innerEl: HTMLElement }
  const fleetMarkersMapRef = useRef(new Map());
  // fleet_id → { lat, lng, heading } — positions at interpolation start
  const fleetPrevRef = useRef({});
  // fleet_id → { lat, lng, heading } — latest polled positions
  const fleetNextRef = useRef({});
  // Timestamp when the last poll completed (used to compute lerp progress)
  const interpStartRef = useRef(0);
  // requestAnimationFrame handle
  const rafIdRef = useRef(null);
  // Latest row data per fleet (read inside stable click handlers)
  const fleetDataRef = useRef({});
  const nearestFleetMarkerRef = useRef(null);
  const routeStopMarkersRef = useRef([]);
  const routePolylineAddedRef = useRef(false);

  const [currentCoords, setCurrentCoords] = useState(null);
  const [destinationInput, setDestinationInput] = useState("");
  const [routeMetrics, setRouteMetrics] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [fleetLocations, setFleetLocations] = useState([]);
  const [nearestFleet, setNearestFleet] = useState(null);
  const [nearestFleetEta, setNearestFleetEta] = useState({
    level: 'idle',
    label: 'No active bus selected',
    etaMinutes: null,
    delayMinutes: 0,
    suggestion: 'Pin your location and find the nearest active bus to view ETA.',
  });
  const [selectedFleetId, setSelectedFleetId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  const [lng] = useState(125.6047);
  const [lat] = useState(7.0707);
  const [zoom] = useState(12);

  const clearFleetMarkers = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    fleetMarkersMapRef.current.forEach(({ marker }) => marker.remove());
    fleetMarkersMapRef.current.clear();
    fleetPrevRef.current = {};
    fleetNextRef.current = {};
    fleetDataRef.current = {};
  }, []);

  const clearRouteStopMarkers = useCallback(() => {
    routeStopMarkersRef.current.forEach((marker) => marker.remove());
    routeStopMarkersRef.current = [];
  }, []);

  // Draw or refresh the fleet's route polyline (Feature 1)
  const drawFleetRoute = useCallback(async (routeId) => {
    const mapObj = map.current;
    const maplibregl = mapLibRef.current;
    if (!mapObj || !maplibregl || !routeId) return;

    try {
      const res = await PassengerService.getRouteStops(routeId);
      const stops = res?.data ?? [];
      const valid = stops.filter(
        (s) => Number.isFinite(Number(s?.longitude)) && Number.isFinite(Number(s?.latitude))
      );
      if (valid.length < 2) return;

      const coords = valid.map((s) => [Number(s.longitude), Number(s.latitude)]);

      const addRoute = () => {
        // Remove existing route layer before drawing new one
        if (mapObj.getLayer('fleet-route-line')) mapObj.removeLayer('fleet-route-line');
        if (mapObj.getSource('fleet-route-path')) mapObj.removeSource('fleet-route-path');
        routePolylineAddedRef.current = false;
        clearRouteStopMarkers();

        mapObj.addSource('fleet-route-path', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: coords },
          },
        });
        mapObj.addLayer({
          id: 'fleet-route-line',
          type: 'line',
          source: 'fleet-route-path',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#f59e0b', 'line-width': 4, 'line-opacity': 0.75 },
        });
        routePolylineAddedRef.current = true;

        // Add stop pins along the selected fleet route for better context.
        routeStopMarkersRef.current = valid.map((stop, idx) => {
          const markerEl = document.createElement('div');
          markerEl.style.width = '16px';
          markerEl.style.height = '16px';
          markerEl.style.borderRadius = '999px';
          markerEl.style.background = '#f59e0b';
          markerEl.style.border = '2px solid #ffffff';
          markerEl.style.boxShadow = '0 0 0 1px rgba(15, 23, 42, 0.35)';

          const label = stop?.stop_name || stop?.name || stop?.stop?.stop_name || `Stop ${idx + 1}`;
          const orderRaw = stop?.stop_order ?? stop?.sequence_number ?? idx + 1;
          const order = Number.isFinite(Number(orderRaw)) ? Number(orderRaw) : idx + 1;

          return new maplibregl.Marker({ element: markerEl })
            .setLngLat([Number(stop.longitude), Number(stop.latitude)])
            .setPopup(
              new maplibregl.Popup({ offset: 14 }).setHTML(
                `<div style="color:#0f172a;font-family:sans-serif;padding:6px;min-width:120px;">
                  <p style="margin:0;font-weight:700;font-size:12px;">Stop ${order}</p>
                  <p style="margin:4px 0 0;font-size:12px;color:#334155;">${label}</p>
                </div>`
              )
            )
            .addTo(mapObj);
        });

        // Fit map to route bounds
        const bounds = coords.reduce(
          (acc, c) => acc.extend(c),
          new maplibregl.LngLatBounds(coords[0], coords[0])
        );
        mapObj.fitBounds(bounds, { padding: 80, maxZoom: 14 });
      };

      if (mapObj.isStyleLoaded()) {
        addRoute();
      } else {
        mapObj.once('load', addRoute);
      }
    } catch {
      // Ignore — map still works without route overlay
    }
  }, [clearRouteStopMarkers]);

  useEffect(() => {
    if (map.current) return;

    let disposed = false;

    const initMap = async () => {
      const { default: maplibregl } = await loadMapLib();
      if (disposed || map.current) return;

      mapLibRef.current = maplibregl;
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        center: [lng, lat],
        zoom,
      });
    };

    void initMap();

    return () => {
      disposed = true;
    };
  }, [lat, lng, zoom]);

  const refreshFleetLocations = useCallback(async () => {
    const maplibregl = mapLibRef.current;
    if (!map.current || !maplibregl || role !== 'passenger') return;

    try {
      const res = await PassengerService.getFleetLocations();
      const locations = (res?.data ?? []).filter(
        (row) => Number.isFinite(Number(row?.longitude)) && Number.isFinite(Number(row?.latitude))
      );
      setFleetLocations(locations);

      const POLL_MS = 12000;
      const now = Date.now();
      const elapsed = now - interpStartRef.current;
      const tSnapshot = Math.min(1, elapsed / POLL_MS);

      // ── Step 1: snapshot current animated position as the new prev ──────────
      const newPrev = {};
      for (const [fleetId, { marker }] of fleetMarkersMapRef.current) {
        const p = fleetPrevRef.current[fleetId];
        const n = fleetNextRef.current[fleetId];
        const lngLat = marker.getLngLat();
        newPrev[fleetId] = p && n ? {
          lat:     lerp(p.lat, n.lat, tSnapshot),
          lng:     lerp(p.lng, n.lng, tSnapshot),
          heading: lerpAngle(p.heading, n.heading, tSnapshot),
        } : { lat: lngLat.lat, lng: lngLat.lng, heading: p?.heading ?? null };
      }
      fleetPrevRef.current = newPrev;

      // ── Step 2: set new targets + update fleet data ref ───────────────────
      const newNext = {};
      for (const row of locations) {
        newNext[row.fleet_id] = {
          lat:     Number(row.latitude),
          lng:     Number(row.longitude),
          heading: Number.isFinite(Number(row.heading)) ? Number(row.heading) : null,
        };
        // Seed prev on first appearance so lerp starts from correct spot
        if (!fleetPrevRef.current[row.fleet_id]) {
          fleetPrevRef.current[row.fleet_id] = newNext[row.fleet_id];
        }
        fleetDataRef.current[row.fleet_id] = row;
      }
      fleetNextRef.current = newNext;
      interpStartRef.current = now;

      // ── Step 3: create/update markers ──────────────────────────────────────
      const activeIds = new Set(locations.map((r) => r.fleet_id));

      for (const row of locations) {
        const fleetId  = row.fleet_id;
        const isActive = ['departed', 'in-progress'].includes(row?.trip_status);
        const bg       = isActive ? '#0ea5e9' : '#64748b';

        const speedLabel   = Number.isFinite(Number(row?.speed_kmh))
          ? `${Number(row.speed_kmh).toFixed(0)} km/h` : 'Speed N/A';
        const headingLabel = Number.isFinite(Number(row?.heading))
          ? ` · Heading ${Number(row.heading).toFixed(0)}°` : '';

        const makePopupHtml = (r) => `
          <div style="color:#0f172a;font-family:sans-serif;padding:6px;min-width:130px;">
            <p style="margin:0;font-weight:700;font-size:13px;">🚌 ${r?.plate_number || 'Bus ' + r?.fleet_id || '-'}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#64748b;text-transform:capitalize;">Status: ${r?.trip_status || 'active'}</p>
            <p style="margin:2px 0 0;font-size:11px;color:#64748b;">${speedLabel}${headingLabel}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#0ea5e9;cursor:pointer;"
               onclick="this.closest('.maplibregl-popup').style.display='none'">Click bus to see route →</p>
          </div>`;

        if (!fleetMarkersMapRef.current.has(fleetId)) {
          // Build the outer element (MapLibre positions this)
          const outerEl = document.createElement('div');
          outerEl.style.cssText = 'width:36px;height:36px;cursor:pointer;';

          // Inner element rotates independently for heading.
          // SVG points "up" (north); icon-rotate maps 0°=north, 90°=east, etc.
          const innerEl = document.createElement('div');
          innerEl.style.cssText = 'width:36px;height:36px;';
          innerEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="${bg}" stroke="#fff" stroke-width="2.5"/>
              <polygon points="18,5 12,14 24,14" fill="rgba(255,255,255,0.9)"/>
              <rect x="10" y="14" width="16" height="11" rx="1.5"
                fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.65)" stroke-width="1"/>
              <rect x="11" y="15.5" width="5" height="3.5" rx="0.5" fill="rgba(255,255,255,0.75)"/>
              <rect x="20" y="15.5" width="5" height="3.5" rx="0.5" fill="rgba(255,255,255,0.75)"/>
            </svg>`;
          outerEl.appendChild(innerEl);

          // Click handler reads from the live ref so it never captures stale data.
          outerEl.addEventListener('click', () => {
            const currentRow = fleetDataRef.current[fleetId];
            setSelectedFleetId(fleetId);
            setShowSidebar(true);
            const routeId = currentRow?.route_id ?? currentRow?.fleet_route?.route_id ?? null;
            if (routeId) void drawFleetRoute(routeId);
          });

          const startPos = fleetPrevRef.current[fleetId] ?? newNext[fleetId];
          const marker = new maplibregl.Marker({ element: outerEl })
            .setLngLat([startPos.lng, startPos.lat])
            .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(makePopupHtml(row)))
            .addTo(map.current);

          fleetMarkersMapRef.current.set(fleetId, { marker, innerEl });
        } else {
          // Update popup content and SVG color for existing marker.
          const { marker, innerEl } = fleetMarkersMapRef.current.get(fleetId);
          marker.getPopup()?.setHTML(makePopupHtml(row));
          const circle = innerEl.querySelector('circle');
          if (circle) circle.setAttribute('fill', bg);
        }
      }

      // ── Step 4: remove stale fleet markers ──────────────────────────────────
      for (const [fleetId, { marker }] of fleetMarkersMapRef.current) {
        if (!activeIds.has(fleetId)) {
          marker.remove();
          fleetMarkersMapRef.current.delete(fleetId);
          delete fleetPrevRef.current[fleetId];
          delete fleetNextRef.current[fleetId];
          delete fleetDataRef.current[fleetId];
        }
      }

      // ── Step 5: start rAF interpolation loop ───────────────────────────────
      cancelAnimationFrame(rafIdRef.current);

      const animate = () => {
        const t = Math.min(1, (Date.now() - interpStartRef.current) / POLL_MS);

        for (const [fleetId, { marker, innerEl }] of fleetMarkersMapRef.current) {
          const p = fleetPrevRef.current[fleetId];
          const n = fleetNextRef.current[fleetId];
          if (!p || !n) continue;

          marker.setLngLat([lerp(p.lng, n.lng, t), lerp(p.lat, n.lat, t)]);

          if (n.heading !== null) {
            const h = lerpAngle(p.heading ?? n.heading, n.heading, t);
            innerEl.style.transform = `rotate(${h}deg)`;
          }
        }

        if (t < 1) rafIdRef.current = requestAnimationFrame(animate);
      };

      rafIdRef.current = requestAnimationFrame(animate);
    } catch {
      // Ignore polling failures to avoid breaking map interactions.
    }
  }, [clearFleetMarkers, drawFleetRoute, role]);

  useEffect(() => {
    if (role !== 'passenger') return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await refreshFleetLocations();
    };

    void tick();
    const id = setInterval(() => {
      void tick();
    }, 12000);

    return () => {
      cancelled = true;
      clearInterval(id);
      clearFleetMarkers();
      clearRouteStopMarkers();
      if (nearestFleetMarkerRef.current) {
        nearestFleetMarkerRef.current.remove();
        nearestFleetMarkerRef.current = null;
      }
    };
  }, [clearFleetMarkers, clearRouteStopMarkers, refreshFleetLocations, role]);

  // ── Track My Bus: center + highlight when trackedFleetId changes ───────────
  useEffect(() => {
    if (!trackedFleetId || !map.current) return;

    const focusFleet = () => {
      const entry = fleetMarkersMapRef.current.get(trackedFleetId);
      if (!entry) return;
      const { marker, innerEl } = entry;
      const lngLat = marker.getLngLat();

      // Fly to the bus
      map.current.flyTo({ center: [lngLat.lng, lngLat.lat], zoom: 15, speed: 1.2 });

      // Add a pulsing amber ring to distinguish the tracked bus
      const circle = innerEl.querySelector('circle');
      if (circle) {
        circle.setAttribute('fill', '#f59e0b');
        circle.setAttribute('stroke', '#fde68a');
        circle.setAttribute('stroke-width', '3');
      }
      innerEl.style.filter = 'drop-shadow(0 0 8px rgba(245,158,11,0.8))';
      setIsTracking(true);
    };

    // Attempt immediately, retry after next poll cycle if marker not yet rendered
    focusFleet();
    const retryId = setTimeout(focusFleet, 3000);
    return () => clearTimeout(retryId);
  }, [trackedFleetId]);

  const handlePinCurrentLocation = () => {
    const maplibregl = mapLibRef.current;
    if (!map.current || !maplibregl) {
      alert("Map is still loading. Please try again in a moment.");
      return;
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        setCurrentCoords({ lng: longitude, lat: latitude });

        map.current.flyTo({ center: [longitude, latitude], zoom: 14 });

        if (currentMarker.current) {
          currentMarker.current.remove();
        }

        currentMarker.current = new maplibregl.Marker({ color: "#38bdf8" })
          .setLngLat([longitude, latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 25 }).setHTML(
              `<div style="color: #0f172a; font-family: sans-serif; padding: 4px;">
                <p style="margin: 0; font-weight: bold;">Current Location</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b; text-transform: capitalize;">Verified ${role}</p>
              </div>`
            )
          )
          .addTo(map.current);
      },
      () => alert("Unable to capture your location hardware coordinates.")
    );
  };

  useEffect(() => {
    if (!currentCoords || !nearestFleet) {
      setNearestFleetEta({
        level: 'idle',
        label: 'No active bus selected',
        etaMinutes: null,
        delayMinutes: 0,
        suggestion: 'Pin your location and find the nearest active bus to view ETA.',
      });
      return;
    }

    let cancelled = false;
    void (async () => {
      const nextStatus = await fetchTrafficStatus({
        currentLat: currentCoords.lat,
        currentLng: currentCoords.lng,
        nextStop: {
          latitude: nearestFleet.latitude,
          longitude: nearestFleet.longitude,
        },
      });

      if (!cancelled) {
        setNearestFleetEta(nextStatus);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentCoords, nearestFleet]);

  const findNearestFleet = async () => {
    const maplibregl = mapLibRef.current;
    if (!currentCoords || !map.current || !maplibregl) {
      alert('Pin your current location first.');
      return;
    }

    try {
      const res = await PassengerService.getNearestFleet({
        latitude: currentCoords.lat,
        longitude: currentCoords.lng,
      });

      const nearest = res?.data ?? null;
      setNearestFleet(nearest);

      if (nearestFleetMarkerRef.current) {
        nearestFleetMarkerRef.current.remove();
        nearestFleetMarkerRef.current = null;
      }

      if (nearest && Number.isFinite(Number(nearest?.longitude)) && Number.isFinite(Number(nearest?.latitude))) {
        nearestFleetMarkerRef.current = new maplibregl.Marker({ color: '#f59e0b' })
          .setLngLat([Number(nearest.longitude), Number(nearest.latitude)])
          .setPopup(
            new maplibregl.Popup({ offset: 20 }).setHTML(
              `<div style="color:#0f172a;font-family:sans-serif;padding:4px;">
                <p style="margin:0;font-weight:700;">Nearest Fleet ${nearest?.plate_number || nearest?.fleet_id || '-'}</p>
                <p style="margin:4px 0 0;font-size:11px;color:#64748b;">~${Number(nearest?.distance_meters || 0).toFixed(0)} m away</p>
              </div>`
            )
          )
          .addTo(map.current);

        // Pan to show both the passenger's pin and the nearest bus
        const bounds = new maplibregl.LngLatBounds(
          [currentCoords.lng, currentCoords.lat],
          [Number(nearest.longitude), Number(nearest.latitude)]
        );
        map.current.fitBounds(bounds, { padding: 80, maxZoom: 14 });
      } else {
        setNearestFleetEta({
          level: 'idle',
          label: 'No active bus found',
          etaMinutes: null,
          delayMinutes: 0,
          suggestion: 'No active trip is near your location right now.',
        });
        alert('No active bus found within 25 km of your location. Check back when a trip is live.');
      }
    } catch {
      alert('Unable to locate nearest fleet right now. Please try again.');
    }
  };

  const handleCalculateRoute = async (e) => {
    e.preventDefault();
    const maplibregl = mapLibRef.current;
    if (!map.current || !maplibregl) {
      alert("Map is still loading. Please try again in a moment.");
      return;
    }

    if (!currentCoords) {
      alert("Please pin your current location first!");
      return;
    }
    if (!destinationInput.trim()) {
      alert("Please input a destination landmark.");
      return;
    }

    setIsCalculating(true);

    try {
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        destinationInput
      )}&viewbox=125.50,7.40,125.90,7.00&bounded=1&limit=1`;

      const geoResponse = await fetch(geocodeUrl, {
        headers: { "Accept-Language": "en" }
      });
      const geoData = await geoResponse.json();

      if (!geoData || geoData.length === 0) {
        alert("Location not found along the Davao-Tagum route. Please try a prominent landmark.");
        setIsCalculating(false);
        return;
      }

      const destinationCoords = {
        lng: parseFloat(geoData[0].lon),
        lat: parseFloat(geoData[0].lat),
        name: geoData[0].display_name.split(',')[0]
      };

      const url = `https://router.project-osrm.org/route/v1/driving/${currentCoords.lng},${currentCoords.lat};${destinationCoords.lng},${destinationCoords.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        alert("No drivable route found to that location.");
        setIsCalculating(false);
        return;
      }

      const route = data.routes[0];
      const geometry = route.geometry;

      setRouteMetrics({
        distance: `${(route.distance / 1000).toFixed(2)} km`,
        duration: `${Math.ceil(route.duration / 60)} mins`,
      });

      if (map.current.getLayer("route-line")) map.current.removeLayer("route-line");
      if (map.current.getSource("route-path")) map.current.removeSource("route-path");

      map.current.addSource("route-path", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry },
      });

      if (destinationMarker.current) {
        destinationMarker.current.remove();
      }

      destinationMarker.current = new maplibregl.Marker({ color: "#ef4444" })
        .setLngLat([destinationCoords.lng, destinationCoords.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div style="color: #0f172a; font-family: sans-serif; padding: 4px;">
              <p style="margin: 0; font-weight: bold;">${destinationCoords.name}</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">Transit Stop</p>
            </div>`
          )
        )
        .addTo(map.current);

      map.current.addLayer({
        id: "route-line",
        type: "line",
        source: "route-path",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#38bdf8", "line-width": 5 },
      });

      const coordinates = geometry.coordinates;
      const bounds = coordinates.reduce(
        (acc, coord) => acc.extend(coord),
        new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
      );
      map.current.fitBounds(bounds, { padding: 60 });

    } catch (err) {
      console.error("Routing calculation failed:", err);
      alert("An error occurred while calculating the route corridor path.");
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="relative h-[75vh] min-h-135 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div ref={mapContainer} className="h-full w-full" />

      {/* Track My Bus banner */}
      {isTracking && trackedFleetId && (
        <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 flex items-center gap-2 rounded-full border border-amber-400/40 bg-slate-950/90 px-4 py-2 text-sm font-semibold text-amber-300 shadow-lg backdrop-blur-md">
          <Navigation className="h-4 w-4 animate-pulse" />
          Tracking your bus
        </div>
      )}

      <aside className="absolute left-4 top-4 z-10 w-[min(92vw,26rem)] rounded-2xl border border-slate-800 bg-slate-950/92 p-4 text-slate-200 shadow-2xl backdrop-blur-md">
        <h3 className="text-lg font-semibold text-slate-100">Where are you heading?</h3>
        <p className="mt-1 text-xs text-slate-500">Calculate real-time transit routes and fares</p>

        <form onSubmit={handleCalculateRoute} className="mt-4 space-y-3">
          <button
            type="button"
            onClick={handlePinCurrentLocation}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              currentCoords
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
            }`}
          >
            <LocateFixed className="h-4 w-4" />
            {currentCoords ? 'Current Location Pinned' : 'Pin Current Location'}
          </button>

          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Destination
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 focus-within:border-sky-400">
              <MapPin className="h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Enter terminal or destination"
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                className="h-11 w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={isCalculating}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Route className="h-4 w-4" />
            {isCalculating ? 'Calculating Route...' : 'Calculate Route'}
          </button>

          {role === 'passenger' && (
            <button
              type="button"
              onClick={findNearestFleet}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/60 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20"
            >
              <MapPin className="h-4 w-4" />
              Track Nearest Fleet
            </button>
          )}
        </form>

        {routeMetrics && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
              <p className="inline-flex items-center gap-1 text-xs text-slate-500"><Ruler className="h-3.5 w-3.5" />Distance</p>
              <p className="font-data mt-1 text-sm font-semibold text-slate-100">{routeMetrics.distance}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
              <p className="inline-flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />Est. Time</p>
              <p className="font-data mt-1 text-sm font-semibold text-slate-100">{routeMetrics.duration}</p>
            </div>
          </div>
        )}

        {role === 'passenger' && (
          <div className="mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <p>Live fleets tracked: <strong className="text-slate-200">{fleetLocations.length}</strong></p>
              <button
                type="button"
                onClick={() => setShowSidebar((v) => !v)}
                className="rounded-lg border border-sky-800 bg-sky-950/30 px-2 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-950/60 transition"
              >
                <Bus className="inline h-3 w-3 mr-1" />{showSidebar ? 'Hide' : 'View'} Fleets
              </button>
            </div>
            <p>
              Nearest: <strong className="text-slate-200">{nearestFleet?.plate_number || nearestFleet?.fleet_id || 'Not selected'}</strong>
              {nearestFleet?.distance_meters ? ` (${Number(nearestFleet.distance_meters).toFixed(0)} m)` : ''}
            </p>
            <div className={`rounded-lg border px-2.5 py-2 ${nearestFleetEta.level === 'heavy' ? 'border-amber-500/50 bg-amber-500/10 text-amber-200' : nearestFleetEta.level === 'moderate' ? 'border-sky-500/50 bg-sky-500/10 text-sky-200' : nearestFleetEta.level === 'idle' ? 'border-slate-500/50 bg-slate-500/10 text-slate-200' : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'}`}>
              <p className="text-[10px] uppercase tracking-[0.16em] text-current/80">ETA to nearest bus</p>
              <p className="mt-1 text-sm font-semibold text-white">{nearestFleetEta.etaMinutes == null ? 'Unavailable' : `${nearestFleetEta.etaMinutes} min`} • {nearestFleetEta.label}</p>
              <p className="mt-1 text-[11px] text-current/90">{nearestFleetEta.suggestion}</p>
            </div>
          </div>
        )}
      </aside>

      {/* ── Feature 6: Nearby Fleets Sidebar ────────────────────────────────── */}
      {role === 'passenger' && showSidebar && fleetLocations.length > 0 && (
        <aside className="absolute right-4 top-4 z-10 w-[min(92vw,22rem)] rounded-2xl border border-slate-800 bg-slate-950/95 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Bus className="h-4 w-4 text-sky-400" />
              Nearby Fleets ({fleetLocations.length})
            </h4>
            <button
              type="button"
              onClick={() => setShowSidebar(false)}
              className="text-slate-500 hover:text-slate-300"
              aria-label="Close fleet sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {[...fleetLocations]
              .map((row) => ({
                ...row,
                _distM: currentCoords
                  ? haversineM(currentCoords.lat, currentCoords.lng, Number(row.latitude), Number(row.longitude))
                  : null,
              }))
              .sort((a, b) => {
                if (a._distM === null) return 1;
                if (b._distM === null) return -1;
                return a._distM - b._distM;
              })
              .map((row) => {
                const isSelected = selectedFleetId === row.fleet_id;
                const isActive = ['departed', 'in-progress'].includes(row?.trip_status);
                const distLabel = row._distM !== null
                  ? row._distM < 1000
                    ? `${Math.round(row._distM)} m`
                    : `${(row._distM / 1000).toFixed(1)} km`
                  : null;

                return (
                  <button
                    key={row.fleet_id ?? row.plate_number}
                    type="button"
                    className={`flex w-full items-center gap-3 border-b border-slate-800/60 px-4 py-3 text-left transition hover:bg-slate-900 ${isSelected ? 'bg-sky-950/40' : ''}`}
                    onClick={() => {
                      setSelectedFleetId(row.fleet_id ?? null);
                      // Center map on this fleet
                      if (map.current && Number.isFinite(Number(row.longitude)) && Number.isFinite(Number(row.latitude))) {
                        map.current.flyTo({ center: [Number(row.longitude), Number(row.latitude)], zoom: 14 });
                      }
                      // Draw route polyline
                      const routeId = row?.route_id ?? row?.fleet_route?.route_id ?? null;
                      if (routeId) void drawFleetRoute(routeId);
                    }}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isActive ? 'bg-sky-500' : 'bg-slate-700'}`}>
                      <span className="text-base">🚌</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-100">
                        {row?.plate_number || `Fleet ${row?.fleet_id || '-'}`}
                      </p>
                      <p className="text-xs text-slate-400 capitalize">
                        {row?.trip_status || 'active'}
                        {distLabel ? ` · ${distLabel} away` : ''}
                      </p>
                    </div>
                    {isSelected && <span className="shrink-0 text-xs text-sky-400">→ Route</span>}
                  </button>
                );
              })}
          </div>

          {!currentCoords && (
            <p className="px-4 py-2 text-xs text-slate-500">Pin your location to see distances</p>
          )}
        </aside>
      )}
    </div>
  );
}
