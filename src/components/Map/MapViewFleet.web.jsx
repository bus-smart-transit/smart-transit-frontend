import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { loadMapLib } from './mapDependencies';

export default function MapView({ route, completedRoute, busPosition, origin, destination, center, trip, focusRequest }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const mapLibRef = useRef(null);
  const initialCenter = useRef(center ? [center[1], center[0]] : [125.6128, 7.0736]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let disposed = false;

    async function initializeMap() {
      const maplibregl = await loadMapLib();
      if (disposed || !mapContainer.current) return;

      mapLibRef.current = maplibregl;
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
            },
          },
          layers: [{ id: 'osm-tiles', type: 'raster', source: 'osm' }],
        },
        center: initialCenter.current,
        zoom: 10,
      });
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.current.once('style.load', () => {
        if (!disposed) setIsReady(true);
      });
    }

    void initializeMap();

    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const mapInstance = map.current;
    const maplibregl = mapLibRef.current;
    if (!isReady || !mapInstance || !maplibregl) return;

    const toFeature = (coordinates) => ({
      type: 'Feature',
      properties: {},
      geometry: coordinates.length > 1
        ? { type: 'LineString', coordinates: coordinates.map(([lat, lng]) => [lng, lat]) }
        : { type: 'LineString', coordinates: [] },
    });
    const sourceData = {
      type: 'FeatureCollection',
      features: route.length > 1 ? [toFeature(route)] : [],
    };
    const completedData = {
      type: 'FeatureCollection',
      features: completedRoute.length > 1 ? [toFeature(completedRoute)] : [],
    };

    if (!mapInstance.getSource('fleet-route')) {
      mapInstance.addSource('fleet-route', { type: 'geojson', data: sourceData });
      mapInstance.addLayer({
        id: 'fleet-route-line',
        type: 'line',
        source: 'fleet-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#f6c66b', 'line-width': 6, 'line-opacity': 0.8 },
      });
    } else {
      mapInstance.getSource('fleet-route').setData(sourceData);
    }

    if (!mapInstance.getSource('fleet-completed-route')) {
      mapInstance.addSource('fleet-completed-route', { type: 'geojson', data: completedData });
      mapInstance.addLayer({
        id: 'fleet-completed-route-line',
        type: 'line',
        source: 'fleet-completed-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#f59e0b', 'line-width': 6 },
      });
    } else {
      mapInstance.getSource('fleet-completed-route').setData(completedData);
    }
  }, [completedRoute, isReady, route]);

  useEffect(() => {
    const mapInstance = map.current;
    const maplibregl = mapLibRef.current;
    if (!isReady || !mapInstance || !maplibregl || route.length < 2) return;

    const bounds = route.reduce(
      (result, [lat, lng]) => result.extend([lng, lat]),
      new maplibregl.LngLatBounds([route[0][1], route[0][0]], [route[0][1], route[0][0]]),
    );
    mapInstance.fitBounds(bounds, { padding: 70, maxZoom: 13 });
  }, [isReady, route]);

  useEffect(() => {
    const mapInstance = map.current;
    const maplibregl = mapLibRef.current;
    if (!isReady || !mapInstance || !maplibregl) return;

    const markers = [];
    const addPointMarker = (position, color, title, detail) => {
      if (!position) return;
      const element = document.createElement('div');
      element.style.cssText = `width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 5px #334155;`;
      const content = document.createElement('div');
      const heading = document.createElement('strong');
      heading.textContent = title;
      const description = document.createElement('div');
      description.textContent = detail;
      content.append(heading, description);
      markers.push(new maplibregl.Marker({ element })
        .setLngLat([position[1], position[0]])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setDOMContent(content))
        .addTo(mapInstance));
    };

    addPointMarker(origin, '#3b82f6', trip.originName, 'Departure');
    addPointMarker(destination, '#16a34a', trip.destinationName, 'Destination');

    if (busPosition) {
      const element = document.createElement('div');
      element.style.cssText = 'display:grid;place-items:center;width:42px;height:42px;border:3px solid #f59e0b;border-radius:50%;background:#fff;font-size:23px;box-shadow:0 2px 9px #334155;';
      element.textContent = '🚌';
      const content = document.createElement('div');
      const heading = document.createElement('strong');
      heading.textContent = trip.busId;
      const description = document.createElement('div');
      description.textContent = `${trip.status} · ${Math.round(Number(trip.progress) * 100)}%`;
      content.append(heading, description);
      markers.push(new maplibregl.Marker({ element, anchor: 'center' })
        .setLngLat([busPosition[1], busPosition[0]])
        .setPopup(new maplibregl.Popup({ offset: 24 }).setDOMContent(content))
        .addTo(mapInstance));
    }

    return () => markers.forEach((marker) => marker.remove());
  }, [busPosition, destination, isReady, origin, trip]);

  useEffect(() => {
    if (!isReady || !focusRequest || !map.current) return;
    map.current.flyTo({
      center: [focusRequest.position[1], focusRequest.position[0]],
      zoom: 14,
      duration: 900,
    });
  }, [focusRequest, isReady]);

  return <div ref={mapContainer} className="h-full w-full" />;
}