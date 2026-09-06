import { useCallback, useEffect, useRef, useState } from 'react';
import { loadMapLib } from '../../../components/Map/mapDependencies';
import 'maplibre-gl/dist/maplibre-gl.css';

const FALLBACK_CENTER = [125.6047, 7.0707];
const ROUTE_SOURCE_ID = 'buy-ticket-route-source';
const ROUTE_LAYER_ID = 'buy-ticket-route-layer';
const ROUTE_GLOW_LAYER_ID = 'buy-ticket-route-glow-layer';
const ROUTE_PROXIMITY_THRESHOLD_METERS = 300;

const toRouteCoordinate = (stopLike) => {
  const coords = extractStopCoordinates(stopLike);
  return coords ? [coords.lng, coords.lat] : null;
};

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

const projectMeters = (lat, lng, refLat) => {
  const latRad = (refLat * Math.PI) / 180;
  return {
    x: lng * 111320 * Math.cos(latRad),
    y: lat * 110540,
  };
};

const pointToSegmentMeters = (point, start, end, refLat) => {
  const p = projectMeters(point.lat, point.lng, refLat);
  const a = projectMeters(start.lat, start.lng, refLat);
  const b = projectMeters(end.lat, end.lng, refLat);

  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const apX = p.x - a.x;
  const apY = p.y - a.y;
  const abLenSq = (abX * abX) + (abY * abY);

  if (abLenSq === 0) {
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    return Math.sqrt((dx * dx) + (dy * dy));
  }

  const t = Math.max(0, Math.min(1, ((apX * abX) + (apY * abY)) / abLenSq));
  const closestX = a.x + (abX * t);
  const closestY = a.y + (abY * t);
  const dx = p.x - closestX;
  const dy = p.y - closestY;
  return Math.sqrt((dx * dx) + (dy * dy));
};

const isPointNearRoute = (lat, lng, routeCoords = [], thresholdMeters = ROUTE_PROXIMITY_THRESHOLD_METERS) => {
  if (!Array.isArray(routeCoords) || routeCoords.length < 2) return true;

  const refLat = Number(lat);
  const point = { lat: Number(lat), lng: Number(lng) };
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return false;

  let minDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < routeCoords.length - 1; i += 1) {
    const [startLng, startLat] = routeCoords[i] || [];
    const [endLng, endLat] = routeCoords[i + 1] || [];

    if (![startLat, startLng, endLat, endLng].every((v) => Number.isFinite(Number(v)))) {
      continue;
    }

    const distance = pointToSegmentMeters(
      point,
      { lat: Number(startLat), lng: Number(startLng) },
      { lat: Number(endLat), lng: Number(endLng) },
      refLat,
    );

    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance <= thresholdMeters;
};

const extractStopCoordinates = (stopLike) => {
  if (!stopLike) return null;
  const lat = Number(stopLike?.stop?.latitude ?? stopLike?.latitude);
  const lng = Number(stopLike?.stop?.longitude ?? stopLike?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const findNearestStop = (lat, lng, stops) => {
  const withCoords = stops
    .map((stop) => {
      const coords = extractStopCoordinates(stop);
      return coords ? { stop, ...coords } : null;
    })
    .filter(Boolean);

  if (!withCoords.length) return null;

  let nearest = withCoords[0];
  let minDistance = Number.POSITIVE_INFINITY;

  for (const item of withCoords) {
    const dLat = lat - item.lat;
    const dLng = lng - item.lng;
    const distance = dLat * dLat + dLng * dLng;
    if (distance < minDistance) {
      minDistance = distance;
      nearest = item;
    }
  }

  return nearest.stop;
};

export default function useDropoffPicker({
  dropoffMode,
  selectedOriginStop,
  selectedStops,
  destinationLat,
  destinationLng,
  stopLabel,
  setError,
  setOriginStopId,
  setDestinationLat,
  setDestinationLng,
}) {
  const [locatingDropoff, setLocatingDropoff] = useState(false);
  const [destinationPinnedLabel, setDestinationPinnedLabel] = useState('');
  const [originPinnedLabel, setOriginPinnedLabel] = useState('');

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mapLibRef = useRef(null);
  const originMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const routeCoordinatesRef = useRef([]);

  const clearDestinationPinnedLabel = useCallback(() => {
    setDestinationPinnedLabel('');
  }, []);

  const updateDestinationMarker = useCallback((lng, lat) => {
    const maplibregl = mapLibRef.current;
    if (!mapRef.current || !maplibregl || !Number.isFinite(lng) || !Number.isFinite(lat)) return;

    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
    }

    destinationMarkerRef.current = new maplibregl.Marker({ color: '#1f6ecf' })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);
  }, []);

  const updateOriginMarker = useCallback((lng, lat) => {
    const maplibregl = mapLibRef.current;
    if (!mapRef.current || !maplibregl || !Number.isFinite(lng) || !Number.isFinite(lat)) return;

    if (originMarkerRef.current) {
      originMarkerRef.current.remove();
    }

    originMarkerRef.current = new maplibregl.Marker({ color: '#f97316' })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);
  }, []);

  const setPinnedDestination = useCallback((lat, lng) => {
    const routeCoords = routeCoordinatesRef.current;
    if (!isPointNearRoute(lat, lng, routeCoords)) {
      setError('Selected drop-off is outside the route path. Please choose a point closer to the route.');
      setDestinationPinnedLabel('Outside route path. Choose a point closer to the highlighted route.');
      setDestinationLat('');
      setDestinationLng('');
      return;
    }

    setDestinationLat(String(lat));
    setDestinationLng(String(lng));
    setError('');

    const nearestStop = findNearestStop(lat, lng, selectedStops || []);
    if (nearestStop) {
      setDestinationPinnedLabel(`Pinned near ${stopLabel(nearestStop)}`);
      return;
    }

    setDestinationPinnedLabel('Pinned custom drop-off location');
  }, [selectedStops, setDestinationLat, setDestinationLng, setError, stopLabel]);

  const drawRouteLine = useCallback((coordinates = []) => {
    const map = mapRef.current;
    if (!map || !Array.isArray(coordinates) || coordinates.length < 2) return;

    const data = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates,
        },
      }],
    };

    const existingSource = map.getSource(ROUTE_SOURCE_ID);
    if (existingSource) {
      existingSource.setData(data);
      return;
    }

    map.addSource(ROUTE_SOURCE_ID, {
      type: 'geojson',
      data,
    });

    map.addLayer({
      id: ROUTE_GLOW_LAYER_ID,
      type: 'line',
      source: ROUTE_SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#22d3ee',
        'line-width': 10,
        'line-opacity': 0.2,
      },
    });

    map.addLayer({
      id: ROUTE_LAYER_ID,
      type: 'line',
      source: ROUTE_SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#0891b2',
        'line-width': 4,
        'line-opacity': 0.95,
      },
    });
  }, []);

  const useCurrentLocationAsDropoff = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Current location is unavailable on this device/browser');
      return;
    }

    setLocatingDropoff(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude);
        const lng = Number(pos.coords.longitude);

        setPinnedDestination(lat, lng);
        updateDestinationMarker(lng, lat);

        if (mapRef.current) {
          mapRef.current.flyTo({ center: [lng, lat], zoom: 14 });
        }

        setLocatingDropoff(false);
      },
      () => {
        setError('Unable to get your current location. Please allow location access.');
        setLocatingDropoff(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, [setError, setPinnedDestination, updateDestinationMarker]);

  const pinCurrentLocationAsOrigin = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Current location is unavailable on this device/browser');
      return;
    }

    setLocatingDropoff(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude);
        const lng = Number(pos.coords.longitude);

        const nearest = findNearestStop(lat, lng, selectedStops || []);
        if (!nearest) {
          setError('No route stop coordinates available. Please pick an origin stop manually.');
          setLocatingDropoff(false);
          return;
        }

        setOriginStopId(String(nearest.stop_id));
        setOriginPinnedLabel(`Origin pinned near ${stopLabel(nearest)}`);
        updateOriginMarker(lng, lat);

        if (mapRef.current) {
          mapRef.current.flyTo({ center: [lng, lat], zoom: 14 });
        }

        setLocatingDropoff(false);
      },
      () => {
        setError('Unable to get your current location. Please allow location access.');
        setLocatingDropoff(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, [selectedStops, setError, setOriginStopId, stopLabel, updateOriginMarker]);

  useEffect(() => {
    if (dropoffMode !== 'custom') return;
    if (!mapContainerRef.current || mapRef.current) return;

    let disposed = false;

    const initializeMap = async () => {
      const { default: maplibregl } = await loadMapLib();
      if (disposed || mapRef.current || !mapContainerRef.current) return;

      mapLibRef.current = maplibregl;

      const originCoords = extractStopCoordinates(selectedOriginStop);
      const center = originCoords ? [originCoords.lng, originCoords.lat] : FALLBACK_CENTER;

      mapRef.current = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center,
        zoom: originCoords ? 13.5 : 11.5,
      });

      if (originCoords) {
        updateOriginMarker(originCoords.lng, originCoords.lat);
      }

      mapRef.current.on('load', () => {
        const stopCoords = (selectedStops || []).map(toRouteCoordinate).filter(Boolean);
        if (stopCoords.length < 2) {
          routeCoordinatesRef.current = [];
          return;
        }

        void (async () => {
          let routeCoords = stopCoords;
          try {
            const roadCoords = await fetchRoadPathFromOsrm(stopCoords);
            if (Array.isArray(roadCoords) && roadCoords.length >= 2) {
              routeCoords = roadCoords;
            }
          } catch {
            // Keep stop-to-stop fallback when OSRM is unavailable.
          }

          routeCoordinatesRef.current = routeCoords;
          drawRouteLine(routeCoords);
        })();
      });

      mapRef.current.on('click', (event) => {
        const lng = Number(event?.lngLat?.lng);
        const lat = Number(event?.lngLat?.lat);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

        setPinnedDestination(lat, lng);
        updateDestinationMarker(lng, lat);
      });
    };

    void initializeMap();

    return () => {
      disposed = true;
    };
  }, [dropoffMode, drawRouteLine, selectedOriginStop, selectedStops, setPinnedDestination, updateDestinationMarker, updateOriginMarker]);

  useEffect(() => {
    if (dropoffMode !== 'custom' || !mapRef.current || !mapRef.current.isStyleLoaded()) return;

    const stopCoords = (selectedStops || []).map(toRouteCoordinate).filter(Boolean);
    if (stopCoords.length < 2) {
      routeCoordinatesRef.current = [];
      return;
    }

    let cancelled = false;

    void (async () => {
      let routeCoords = stopCoords;
      try {
        const roadCoords = await fetchRoadPathFromOsrm(stopCoords);
        if (Array.isArray(roadCoords) && roadCoords.length >= 2) {
          routeCoords = roadCoords;
        }
      } catch {
        // Keep stop-to-stop fallback when OSRM is unavailable.
      }

      if (cancelled) return;
      routeCoordinatesRef.current = routeCoords;
      drawRouteLine(routeCoords);
    })();

    return () => {
      cancelled = true;
    };
  }, [drawRouteLine, dropoffMode, selectedStops]);

  useEffect(() => {
    if (dropoffMode !== 'custom' || !mapRef.current) return;

    const lat = Number(destinationLat);
    const lng = Number(destinationLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    updateDestinationMarker(lng, lat);

    if (!destinationPinnedLabel) {
      const nearestStop = findNearestStop(lat, lng, selectedStops || []);
      const timer = setTimeout(() => {
        setDestinationPinnedLabel(nearestStop ? `Pinned near ${stopLabel(nearestStop)}` : 'Pinned custom drop-off location');
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [dropoffMode, destinationLat, destinationLng, destinationPinnedLabel, selectedStops, stopLabel, updateDestinationMarker]);

  useEffect(() => {
    if (dropoffMode === 'custom') return;

    if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }
    if (mapRef.current) {
      if (mapRef.current.getLayer(ROUTE_LAYER_ID)) {
        mapRef.current.removeLayer(ROUTE_LAYER_ID);
      }
      if (mapRef.current.getLayer(ROUTE_GLOW_LAYER_ID)) {
        mapRef.current.removeLayer(ROUTE_GLOW_LAYER_ID);
      }
      if (mapRef.current.getSource(ROUTE_SOURCE_ID)) {
        mapRef.current.removeSource(ROUTE_SOURCE_ID);
      }
      mapRef.current.remove();
      mapRef.current = null;
    }
    routeCoordinatesRef.current = [];
  }, [dropoffMode]);

  useEffect(() => {
    if (dropoffMode !== 'custom' || !mapRef.current) return;

    const originCoords = extractStopCoordinates(selectedOriginStop);
    if (!originCoords) return;

    updateOriginMarker(originCoords.lng, originCoords.lat);
    const timer = setTimeout(() => {
      setOriginPinnedLabel(`Origin pinned at ${stopLabel(selectedOriginStop)}`);
    }, 0);
    mapRef.current.flyTo({ center: [originCoords.lng, originCoords.lat], zoom: 13.5 });
    return () => clearTimeout(timer);
  }, [dropoffMode, selectedOriginStop, stopLabel, updateOriginMarker]);

  useEffect(() => () => {
    if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }
    if (mapRef.current) {
      if (mapRef.current.getLayer(ROUTE_LAYER_ID)) {
        mapRef.current.removeLayer(ROUTE_LAYER_ID);
      }
      if (mapRef.current.getLayer(ROUTE_GLOW_LAYER_ID)) {
        mapRef.current.removeLayer(ROUTE_GLOW_LAYER_ID);
      }
      if (mapRef.current.getSource(ROUTE_SOURCE_ID)) {
        mapRef.current.removeSource(ROUTE_SOURCE_ID);
      }
      mapRef.current.remove();
      mapRef.current = null;
    }
    routeCoordinatesRef.current = [];
  }, []);

  return {
    mapContainerRef,
    locatingDropoff,
    destinationPinnedLabel,
    originPinnedLabel,
    clearDestinationPinnedLabel,
    useCurrentLocationAsDropoff,
    pinCurrentLocationAsOrigin,
  };
}
