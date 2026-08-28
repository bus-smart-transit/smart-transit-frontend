import { useCallback, useEffect, useRef, useState } from 'react';
import { loadMapLib } from '../../../components/Map/mapDependencies';
import 'maplibre-gl/dist/maplibre-gl.css';

const FALLBACK_CENTER = [125.6047, 7.0707];

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
    setDestinationLat(String(lat));
    setDestinationLng(String(lng));

    const nearestStop = findNearestStop(lat, lng, selectedStops || []);
    if (nearestStop) {
      setDestinationPinnedLabel(`Pinned near ${stopLabel(nearestStop)}`);
      return;
    }

    setDestinationPinnedLabel('Pinned custom drop-off location');
  }, [selectedStops, setDestinationLat, setDestinationLng, stopLabel]);

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
  }, [dropoffMode, selectedOriginStop, setPinnedDestination, updateDestinationMarker, updateOriginMarker]);

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
      mapRef.current.remove();
      mapRef.current = null;
    }
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
      mapRef.current.remove();
      mapRef.current = null;
    }
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
