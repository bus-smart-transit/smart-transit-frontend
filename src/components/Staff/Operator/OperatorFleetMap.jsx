import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Radio } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import RouteMap from '../../Map/RouteMap';
import { createBusMarkerElement } from '../../Map/mapMarkers';
import { setGeoJson } from '../../Map/routeLayers';
import drawWhenReady from '../../Map/drawWhenReady';
import { fetchRouteMapData } from '../../../services/routeMapService';
import { OpCard } from './OperatorUI';

const LINES_SOURCE = 'op-fleet-routes';
const LINES_LAYER = 'op-fleet-routes-line';

/** The bus colour per state, and the legend under the map. */
const BUS_STATE = {
  in_service: { color: '#16a34a', label: 'In service' },
  delayed: { color: '#f59e0b', label: 'Delayed' },
  off_route: { color: '#e11d48', label: 'Off route' },
};

/**
 * Batch 81 (user, 2026-11-19): the dashboard's live fleet map. Every route with a trip today is drawn in its own colour
 * (the same colour and R-code as Today's trips), and every running or delayed bus that reports a position is a marker
 * coloured by its state. The map fits the buses and routes once; after that it stays where the Operator leaves it.
 */
export default function OperatorFleetMap({ routes = [], buses = [], colors = new Map(), onOpenFull }) {
  const mapRef = useRef(null);
  const libRef = useRef(null);
  const markersRef = useRef(new Map());
  const fittedRef = useRef(false);
  const requestedRef = useRef(new Set());
  const [mapReady, setMapReady] = useState(false);
  const [geometry, setGeometry] = useState({});

  const handleMapReady = useCallback((map, maplibregl) => {
    mapRef.current = map;
    libRef.current = maplibregl;
    setMapReady(true);
  }, []);

  // The route lines: each route once, in the direction its first bus or trip runs.
  const wanted = useMemo(() => {
    const byRoute = new Map();
    buses.forEach((bus) => { if (bus.routeId && !byRoute.has(bus.routeId)) byRoute.set(bus.routeId, bus.direction); });
    routes.forEach((row) => { if (!byRoute.has(row.routeId)) byRoute.set(row.routeId, 'outbound'); });
    return [...byRoute.entries()];
  }, [routes, buses]);

  useEffect(() => {
    const missing = wanted.filter(([routeId]) => !requestedRef.current.has(routeId));
    if (missing.length === 0) return undefined;
    const timer = setTimeout(() => {
      missing.forEach(([routeId, direction]) => {
        requestedRef.current.add(routeId);
        fetchRouteMapData(routeId, direction)
          .then((data) => setGeometry((prev) => ({ ...prev, [routeId]: data?.geometry })))
          .catch(() => requestedRef.current.delete(routeId));
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [wanted]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return undefined;
    const features = wanted
      .map(([routeId]) => ({ routeId, coordinates: geometry[routeId]?.coordinates }))
      .filter((row) => Array.isArray(row.coordinates) && row.coordinates.length > 1)
      .map((row) => ({ type: 'Feature', properties: { color: colors.get(row.routeId)?.color || '#64748b' }, geometry: { type: 'LineString', coordinates: row.coordinates } }));
    const apply = () => {
      try {
        setGeoJson(map, LINES_SOURCE, { type: 'FeatureCollection', features });
        if (!map.getLayer(LINES_LAYER)) {
          map.addLayer({
            id: LINES_LAYER, type: 'line', source: LINES_SOURCE,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': ['get', 'color'], 'line-width': 4, 'line-opacity': 0.8 },
          });
        }
      } catch { /* the style is not ready yet; the next change draws it */ }
    };
    return drawWhenReady(map, apply);
  }, [mapReady, wanted, geometry, colors]);

  // Bus markers: added, moved, recoloured and removed as the positions change.
  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = libRef.current;
    if (!mapReady || !map || !maplibregl) return;
    const seen = new Set();
    buses.forEach((bus) => {
      const key = String(bus.tripId);
      seen.add(key);
      const color = (BUS_STATE[bus.state] ?? BUS_STATE.in_service).color;
      const title = `${bus.label} (${(BUS_STATE[bus.state] ?? BUS_STATE.in_service).label})`;
      const existing = markersRef.current.get(key);
      if (existing) {
        existing.marker.setLngLat([bus.longitude, bus.latitude]);
        existing.handle.setColor(color);
        existing.handle.setHeading(bus.heading);
        existing.handle.element.title = title;
        return;
      }
      const handle = createBusMarkerElement({ color, heading: bus.heading, title });
      const marker = new maplibregl.Marker({ element: handle.element }).setLngLat([bus.longitude, bus.latitude]).addTo(map);
      markersRef.current.set(key, { marker, handle });
    });
    for (const [key, entry] of markersRef.current) {
      if (!seen.has(key)) {
        entry.marker.remove();
        markersRef.current.delete(key);
      }
    }
    // Fit once, to the buses (or, with none, to the drawn routes).
    if (!fittedRef.current) {
      const points = buses.map((bus) => [bus.longitude, bus.latitude]);
      Object.values(geometry).forEach((g) => (g?.coordinates || []).forEach((c) => points.push(c)));
      if (points.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        points.forEach((p) => bounds.extend(p));
        try { map.fitBounds(bounds, { padding: 40, maxZoom: 13, duration: 0 }); fittedRef.current = buses.length > 0 || Object.keys(geometry).length >= wanted.length; } catch { /* not ready */ }
      }
    }
  }, [mapReady, buses, geometry, wanted]);

  useEffect(() => () => {
    for (const entry of markersRef.current.values()) entry.marker.remove();
    markersRef.current.clear();
  }, []);

  const counts = Object.fromEntries(Object.keys(BUS_STATE).map((state) => [state, buses.filter((bus) => bus.state === state).length]));

  return (
    <OpCard
      icon={Radio}
      accent="green"
      title="Live fleet map"
      subtitle="Today's routes in their colours, and the buses on them."
      badge={onOpenFull && (
        <button type="button" onClick={onOpenFull} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          View full map <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    >
      <div className="overflow-hidden rounded-xl ring-1 ring-slate-200" data-testid="operator-fleet-map">
        <RouteMap routeId={null} showStatus={false} onMapReady={handleMapReady} className="relative h-72 w-full sm:h-80" />
      </div>
      <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-slate-600" aria-label="Map legend">
        {Object.entries(BUS_STATE).map(([state, { color, label }]) => (
          <li key={state} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
            {label} ({counts[state]})
          </li>
        ))}
      </ul>
    </OpCard>
  );
}
