import { useEffect, useRef, useState, useCallback } from 'react';
import { loadMapLib } from '../Map/mapDependencies';
import StaffService from '../../api/StaffService/StaffService';

/**
 * Embedded MapLibre GL map for the driver's Navigation tab.
 * Shows:
 *   - Driver's live GPS position (green marker, updated from lastGpsRef)
 *   - Destination stop (red marker)
 *   - Route polyline connecting all stops
 *
 * Gated: only rendered when isPaired && hasActiveTrip.
 */
export default function DriverNavigationMap({ trip, stops, lastGpsRef }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const mapLibRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const routeLayerAddedRef = useRef(false);

  const [mapError, setMapError] = useState('');
  const [routeLoaded, setRouteLoaded] = useState(false);

  const routeId = trip?.fleet_route?.route?.route_id ?? null;
  const originLabel = trip?.fleet_route?.route?.origin || 'Origin';
  const destinationLabel = trip?.fleet_route?.route?.destination || 'Destination';

  // Initialise map once container is mounted
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;
    let disposed = false;

    (async () => {
      try {
        const { default: maplibregl } = await loadMapLib();
        if (disposed || !mapContainer.current) return;
        mapLibRef.current = maplibregl;

        const defaultCenter = [125.6047, 7.0707];
        mapRef.current = new maplibregl.Map({
          container: mapContainer.current,
          style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
          center: defaultCenter,
          zoom: 11,
        });
      } catch {
        if (!disposed) setMapError('Map failed to load.');
      }
    })();

    return () => {
      disposed = true;
    };
  }, []);

  // Draw route polyline + stop markers when routeId is available
  const drawRoute = useCallback(async () => {
    const map = mapRef.current;
    const maplibregl = mapLibRef.current;
    if (!map || !maplibregl || !routeId || routeLayerAddedRef.current) return;

    try {
      const res = await StaffService.getRouteStops(routeId);
      const stopList = res?.data ?? [];
      const valid = stopList.filter(
        (s) => Number.isFinite(Number(s?.longitude)) && Number.isFinite(Number(s?.latitude))
      );
      if (valid.length < 2) return;

      const coords = valid.map((s) => [Number(s.longitude), Number(s.latitude)]);

      const addLayers = () => {
        if (routeLayerAddedRef.current) return;
        routeLayerAddedRef.current = true;

        // Route polyline
        map.addSource('route-path', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: coords },
          },
        });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-path',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#38bdf8', 'line-width': 4, 'line-opacity': 0.8 },
        });

        // Stop dot markers (small)
        valid.forEach((stop, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === valid.length - 1;
          const el = document.createElement('div');
          el.style.cssText = `width:10px;height:10px;border-radius:50%;border:2px solid #fff;background:${isFirst ? '#22c55e' : isLast ? '#ef4444' : '#38bdf8'};`;
          new maplibregl.Marker({ element: el })
            .setLngLat([Number(stop.longitude), Number(stop.latitude)])
            .setPopup(
              new maplibregl.Popup({ offset: 14 }).setHTML(
                `<p style="margin:0;font-size:12px;font-weight:700;color:#0f172a;">${stop.stop_name || `Stop ${idx + 1}`}</p>
                 <p style="margin:2px 0 0;font-size:10px;color:#64748b;">${stop.distance_from_origin_km} km from origin</p>`
              )
            )
            .addTo(map);
        });

        // Fit bounds to route
        const bounds = coords.reduce(
          (acc, c) => acc.extend(c),
          new maplibregl.LngLatBounds(coords[0], coords[0])
        );
        map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
        setRouteLoaded(true);
      };

      if (map.isStyleLoaded()) {
        addLayers();
      } else {
        map.once('load', addLayers);
      }
    } catch {
      // Ignore — map will show without route overlay
    }
  }, [routeId]);

  useEffect(() => {
    void drawRoute();
  }, [drawRoute]);

  // Update driver position marker whenever lastGpsRef changes (every 10s push)
  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = mapLibRef.current;
    if (!map || !maplibregl) return;

    const tick = () => {
      const pos = lastGpsRef?.current;
      if (!pos || !Number.isFinite(pos.latitude) || !Number.isFinite(pos.longitude)) return;

      const lngLat = [pos.longitude, pos.latitude];
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLngLat(lngLat);
      } else {
        const el = document.createElement('div');
        el.innerHTML = `<div style="width:18px;height:18px;border-radius:50%;background:#22c55e;border:3px solid #fff;box-shadow:0 0 0 3px rgba(34,197,94,0.35);"></div>`;
        driverMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat(lngLat)
          .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML('<p style="margin:0;font-size:12px;color:#0f172a;font-weight:700;">Your Position</p>'))
          .addTo(map);
      }
    };

    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [lastGpsRef]);

  // Cleanup map on unmount
  useEffect(() => () => {
    mapRef.current?.remove();
    mapRef.current = null;
    routeLayerAddedRef.current = false;
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
      {/* Route label header */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-2">
        <span className="h-3 w-3 rounded-full bg-emerald-400" />
        <span className="text-sm font-semibold text-slate-100">{originLabel}</span>
        <span className="text-slate-500">→</span>
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="text-sm font-semibold text-slate-100">{destinationLabel}</span>
        {routeLoaded && (
          <span className="ml-auto text-xs text-emerald-400">Route loaded</span>
        )}
      </div>
      {/* Map canvas */}
      <div ref={mapContainer} style={{ height: '400px', width: '100%' }} />
      {/* Legend */}
      <div className="flex flex-wrap gap-4 border-t border-slate-800 px-4 py-2 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-emerald-400" />Your position</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-sky-400" />Route stop</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-red-400" />Destination</span>
        {stops.length > 0 && (
          <span className="ml-auto">{stops.filter((s) => s.is_acknowledged).length}/{stops.length} stops acknowledged</span>
        )}
      </div>
    </div>
  );
}
