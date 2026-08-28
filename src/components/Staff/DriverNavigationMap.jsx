import { useEffect, useRef, useState } from 'react';
import { loadMapLib } from '../Map/mapDependencies';
import StaffService from '../../api/StaffService/StaffService';

const DRIVER_ROUTE_SOURCE_ID = 'driver-route';
const DRIVER_ROUTE_LINE_LAYER_ID = 'driver-route-line';
const DRIVER_ROUTE_STOPS_SOURCE_ID = 'driver-route-stops';
const DRIVER_ROUTE_STOPS_LAYER_ID = 'driver-route-stops-layer';
const DRIVER_ROUTE_STOPS_LABEL_LAYER_ID = 'driver-route-stops-label-layer';

/**
 * Embedded MapLibre GL map for the driver's Navigation tab.
 * Shows:
 *   - Driver's live GPS position (green pulsing dot, updated from lastGpsRef)
 *   - Route polyline connecting all stops (sky-blue)
 *   - Origin marker (green), destination marker (red), intermediate stops (sky dots)
 *
 * Race-condition fix: all drawing happens AFTER the MapLibre 'load' event fires,
 * not at component mount time (when map is still async-initialising).
 */
export default function DriverNavigationMap({ trip, stops, lastGpsRef }) {
  const mapContainer = useRef(null);
  const mapRef       = useRef(null);
  const mapLibRef    = useRef(null);
  const driverSourceAddedRef = useRef(false);
  const routeDrawnRef     = useRef(false);
  const gpsIntervalRef    = useRef(null);

  const [mapReady, setMapReady]         = useState(false);
  const [routeLoaded, setRouteLoaded]   = useState(false);
  const [mapError, setMapError]         = useState('');

  const routeId          = trip?.fleet_route?.route?.route_id ?? null;
  const originLabel      = trip?.fleet_route?.route?.origin       || 'Origin';
  const destinationLabel = trip?.fleet_route?.route?.destination  || 'Destination';

  // ── 1. Initialise map ─────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;
    let cancelled = false;

    (async () => {
      try {
        const { default: maplibregl } = await loadMapLib();
        if (cancelled || !mapContainer.current) return;

        mapLibRef.current = maplibregl;
        const map = new maplibregl.Map({
          container: mapContainer.current,
          style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
          center: [4.33, 52.07], // Netherlands default — overridden when route loads
          zoom: 11,
        });
        mapRef.current = map;

        // Signal all dependent effects only once base tiles have rendered.
        map.once('load', () => {
          if (!cancelled) setMapReady(true);
        });
      } catch {
        if (!cancelled) setMapError('Map failed to load. Check your internet connection.');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── 2. Draw route polyline + stop markers (fires once map is ready) ───────
  useEffect(() => {
    if (!mapReady || routeDrawnRef.current) return;
    const map        = mapRef.current;
    const maplibregl = mapLibRef.current;
    if (!map || !maplibregl || !routeId) return;

    routeDrawnRef.current = true; // prevent double-draw in StrictMode

    (async () => {
      try {
        const res      = await StaffService.getRouteStops(routeId);
        const stopList = res?.data ?? [];
        const valid    = stopList.filter(
          (s) => Number.isFinite(Number(s?.longitude)) && Number.isFinite(Number(s?.latitude))
        );
        if (valid.length < 2) { routeDrawnRef.current = false; return; }

        const coords = valid.map((s) => [Number(s.longitude), Number(s.latitude)]);

        // Route polyline
        map.addSource(DRIVER_ROUTE_SOURCE_ID, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
        });
        map.addLayer({
          id: DRIVER_ROUTE_LINE_LAYER_ID,
          type: 'line',
          source: DRIVER_ROUTE_SOURCE_ID,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#38bdf8', 'line-width': 5, 'line-opacity': 0.85 },
        });

        // Route stop pins as map layers, so they stay correctly anchored while zooming/panning.
        map.addSource(DRIVER_ROUTE_STOPS_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: valid.map((stop, idx) => ({
              type: 'Feature',
              properties: {
                stopName: stop.stop_name || `Stop ${idx + 1}`,
                stopOrder: idx + 1,
                isFirst: idx === 0,
                isLast: idx === valid.length - 1,
              },
              geometry: {
                type: 'Point',
                coordinates: [Number(stop.longitude), Number(stop.latitude)],
              },
            })),
          },
        });

        map.addLayer({
          id: DRIVER_ROUTE_STOPS_LAYER_ID,
          type: 'circle',
          source: DRIVER_ROUTE_STOPS_SOURCE_ID,
          paint: {
            'circle-radius': [
              'case',
              ['get', 'isFirst'], 8,
              ['get', 'isLast'], 8,
              6,
            ],
            'circle-color': [
              'case',
              ['get', 'isFirst'], '#22c55e',
              ['get', 'isLast'], '#ef4444',
              '#38bdf8',
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        });

        map.addLayer({
          id: DRIVER_ROUTE_STOPS_LABEL_LAYER_ID,
          type: 'symbol',
          source: DRIVER_ROUTE_STOPS_SOURCE_ID,
          layout: {
            'text-field': ['concat', ['to-string', ['get', 'stopOrder']], '. ', ['get', 'stopName']],
            'text-size': 11,
            'text-offset': [0, 1.25],
            'text-anchor': 'top',
            'text-allow-overlap': false,
          },
          paint: {
            'text-color': '#dbeafe',
            'text-halo-color': '#0f172a',
            'text-halo-width': 1,
          },
        });

        map.on('click', DRIVER_ROUTE_STOPS_LAYER_ID, (ev) => {
          const feature = ev?.features?.[0];
          if (!feature) return;
          const coordinates = feature?.geometry?.coordinates;
          if (!Array.isArray(coordinates)) return;
          const stopName = feature?.properties?.stopName || 'Stop';
          new maplibregl.Popup({ offset: 12 })
            .setLngLat(coordinates)
            .setHTML(
              `<p style="margin:0;font-size:12px;font-weight:700;color:#0f172a;">${stopName}</p>`
            )
            .addTo(map);
        });

        // Fit to full route extent
        const bounds = coords.reduce(
          (acc, c) => acc.extend(c),
          new maplibregl.LngLatBounds(coords[0], coords[0])
        );
        map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
        setRouteLoaded(true);
      } catch {
        routeDrawnRef.current = false; // allow retry on next render
      }
    })();
  }, [mapReady, routeId]);

  // ── 3. Driver position (GeoJSON circle layer, updated every 1 s) ──────────
  // Reading lastGpsRef at 1-second granularity is smooth because
  // watchPosition fires every few hundred ms on modern mobile — the ref is
  // always fresh, so 1 s intervals produce near-continuous movement.
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    const DRIVER_POS_SOURCE = 'driver-position';
    const DRIVER_POS_PULSE  = 'driver-position-pulse';
    const DRIVER_POS_DOT    = 'driver-position-dot';

    const updatePosition = () => {
      const pos = lastGpsRef?.current;
      if (!pos || !Number.isFinite(pos.latitude) || !Number.isFinite(pos.longitude)) return;

      const coords  = [Number(pos.longitude), Number(pos.latitude)];
      const geoData = {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: coords },
      };

      if (driverSourceAddedRef.current) {
        // Update in place — no DOM churn, no teleport flicker.
        const src = map.getSource(DRIVER_POS_SOURCE);
        if (src) {
          src.setData(geoData);
          map.panTo(coords, { duration: 900, easing: (t) => t * (2 - t) });
        }
      } else if (map.isStyleLoaded()) {
        map.addSource(DRIVER_POS_SOURCE, { type: 'geojson', data: geoData });

        // Outer pulse ring
        map.addLayer({
          id: DRIVER_POS_PULSE,
          type: 'circle',
          source: DRIVER_POS_SOURCE,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 18, 16, 26],
            'circle-color': 'rgba(34,197,94,0.12)',
            'circle-stroke-color': 'rgba(34,197,94,0.5)',
            'circle-stroke-width': 2,
          },
        });

        // Inner position dot
        map.addLayer({
          id: DRIVER_POS_DOT,
          type: 'circle',
          source: DRIVER_POS_SOURCE,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 7, 16, 11],
            'circle-color': '#22c55e',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 3,
          },
        });

        driverSourceAddedRef.current = true;
        map.flyTo({ center: coords, zoom: 13, duration: 800 });
      }
    };

    updatePosition();
    gpsIntervalRef.current = setInterval(updatePosition, 1000);
    return () => clearInterval(gpsIntervalRef.current);
  }, [mapReady, lastGpsRef]);

  // ── 4. Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => () => {
    clearInterval(gpsIntervalRef.current);

    const map = mapRef.current;
    if (map) {
      if (map.getLayer('driver-position-dot'))   map.removeLayer('driver-position-dot');
      if (map.getLayer('driver-position-pulse'))  map.removeLayer('driver-position-pulse');
      if (map.getSource('driver-position'))       map.removeSource('driver-position');
      if (map.getLayer(DRIVER_ROUTE_STOPS_LABEL_LAYER_ID)) map.removeLayer(DRIVER_ROUTE_STOPS_LABEL_LAYER_ID);
      if (map.getLayer(DRIVER_ROUTE_STOPS_LAYER_ID)) map.removeLayer(DRIVER_ROUTE_STOPS_LAYER_ID);
      if (map.getSource(DRIVER_ROUTE_STOPS_SOURCE_ID)) map.removeSource(DRIVER_ROUTE_STOPS_SOURCE_ID);
      if (map.getLayer(DRIVER_ROUTE_LINE_LAYER_ID)) map.removeLayer(DRIVER_ROUTE_LINE_LAYER_ID);
      if (map.getSource(DRIVER_ROUTE_SOURCE_ID)) map.removeSource(DRIVER_ROUTE_SOURCE_ID);
    }

    mapRef.current?.remove();
    mapRef.current        = null;
    routeDrawnRef.current = false;
    driverSourceAddedRef.current = false;
  }, []);

  if (mapError) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-red-900 bg-red-950/30 p-6 text-sm text-red-300">
        {mapError}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-2">
        <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-400" />
        <span className="text-sm font-semibold text-slate-100">{originLabel}</span>
        <span className="text-slate-500">→</span>
        <span className="h-3 w-3 shrink-0 rounded-full bg-red-400" />
        <span className="text-sm font-semibold text-slate-100">{destinationLabel}</span>
        <span className="ml-auto text-xs text-slate-500">
          {!mapReady ? 'Loading map…' : routeLoaded ? '✓ Route loaded' : 'Drawing route…'}
        </span>
      </div>
      <div ref={mapContainer} style={{ height: '420px', width: '100%' }} />
      <div className="flex flex-wrap gap-4 border-t border-slate-800 px-4 py-2 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-emerald-400" />Your position</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-sky-400" />Route</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-red-400" />Destination</span>
        {stops.length > 0 && (
          <span className="ml-auto">{stops.filter((s) => s.is_acknowledged).length}/{stops.length} stops acknowledged</span>
        )}
      </div>
    </div>
  );
}
