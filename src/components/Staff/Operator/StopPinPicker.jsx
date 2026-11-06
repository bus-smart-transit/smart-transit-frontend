import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Crosshair, Maximize2, Minimize2 } from 'lucide-react';
import { loadMapLib } from '../../Map/mapDependencies';
import { watchMapHealth } from '../../Map/mapHealth';
import MapUnavailable from '../../Map/MapUnavailable';
import { getRegion, regionMapBounds } from '../../../services/regionService';
import { MAP_CONFIG } from '../../../config/mapConfig';
import { parsePin, roundCoord } from '../../../utils/stopPin';

const INPUT = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500';
const BUTTON = 'inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const PIN_ZOOM = 17;

function otherStopElement(name) {
  const el = document.createElement('div');
  el.className = 'h-3 w-3 rounded-full border-2 border-white bg-slate-500 shadow';
  el.title = name;
  el.setAttribute('aria-hidden', 'true');
  return el;
}

/**
 * 2026-11-06 (Batch 47 part A): where the stop is. Tap or click the map to put the pin there, or drag the pin.
 * "Use my location" puts it where the phone is. The Latitude and Longitude boxes are the same pin for keyboard use.
 * Other stops are grey dots so a stop is not added twice. focusKey changes (a place was picked) fly the map to the pin.
 * onChange({ latitude, longitude }) gets strings, as the form keeps them.
 */
export default function StopPinPicker(props) {
  const [attempt, setAttempt] = useState(0);
  return <StopPinPickerInner key={attempt} {...props} onRetry={() => setAttempt((n) => n + 1)} />;
}

function StopPinPickerInner({ latitude, longitude, onChange, otherStops = [], focusKey = 0, onRetry }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const libRef = useRef(null);
  const pinRef = useRef(null);
  const otherMarkersRef = useRef([]);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);
  const [issue, setIssue] = useState(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateMsg, setLocateMsg] = useState('');

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const pin = parsePin(latitude, longitude);

  // 1. The map, once.
  useEffect(() => {
    let cancelled = false;
    let stopWatching = null;
    (async () => {
      try {
        const [{ default: maplibregl }, region] = await Promise.all([loadMapLib(), getRegion()]);
        if (cancelled || !containerRef.current) return;
        libRef.current = maplibregl;
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: MAP_CONFIG.basemapStyleUrl,
          bounds: regionMapBounds(region),
          fitBoundsOptions: { padding: 16 },
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        stopWatching = watchMapHealth(map, {
          onFail: () => setIssue({ blocking: true, message: 'The map could not be loaded. Type the latitude and longitude below, or try again.' }),
          onTrouble: () => setIssue({ blocking: false, message: 'Some map tiles could not be loaded.' }),
          onRecover: () => setIssue(null),
        });
        map.on('click', (event) => {
          onChangeRef.current({ latitude: String(roundCoord(event.lngLat.lat)), longitude: String(roundCoord(event.lngLat.lng)) });
        });
        map.once('load', () => { if (!cancelled) setReady(true); });
      } catch {
        if (!cancelled) setIssue({ blocking: true, message: 'The map could not be started. Type the latitude and longitude below.' });
      }
    })();
    return () => {
      cancelled = true;
      stopWatching?.();
      otherMarkersRef.current.forEach((marker) => marker.remove());
      otherMarkersRef.current = [];
      pinRef.current?.remove();
      pinRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. The pin follows the form (a click, a drag, a picked place or typed numbers).
  const pinLat = pin?.latitude;
  const pinLng = pin?.longitude;
  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = libRef.current;
    if (!ready || !map || !maplibregl) return;
    if (pinLat === undefined) {
      pinRef.current?.remove();
      pinRef.current = null;
      return;
    }
    if (!pinRef.current) {
      const marker = new maplibregl.Marker({ color: '#0d9488', draggable: true }).setLngLat([pinLng, pinLat]).addTo(map);
      marker.on('dragend', () => {
        const at = marker.getLngLat();
        onChangeRef.current({ latitude: String(roundCoord(at.lat)), longitude: String(roundCoord(at.lng)) });
      });
      pinRef.current = marker;
    } else {
      pinRef.current.setLngLat([pinLng, pinLat]);
    }
  }, [ready, pinLat, pinLng]);

  // 3. Fly to the pin when it opens on an existing stop or a place was picked.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || pinLat === undefined) return;
    map.flyTo({ center: [pinLng, pinLat], zoom: Math.max(map.getZoom(), PIN_ZOOM), essential: true });
    // Only on open and on a new picked place, not on every click or drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, focusKey]);

  // 4. The other stops, as grey dots.
  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = libRef.current;
    if (!ready || !map || !maplibregl) return;
    otherMarkersRef.current.forEach((marker) => marker.remove());
    otherMarkersRef.current = otherStops
      .map((stop) => ({ stop, at: parsePin(stop.latitude, stop.longitude) }))
      .filter(({ at }) => at)
      .map(({ stop, at }) => new maplibregl.Marker({ element: otherStopElement(stop.stop_name) }).setLngLat([at.longitude, at.latitude]).addTo(map));
  }, [ready, otherStops]);

  // 5. Full screen changes the box size; the map must redraw to fill it.
  useEffect(() => {
    const id = setTimeout(() => mapRef.current?.resize(), 50);
    return () => clearTimeout(id);
  }, [fullScreen]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocateMsg('This device cannot share its location.');
      return;
    }
    setLocating(true);
    setLocateMsg('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const next = { latitude: roundCoord(position.coords.latitude), longitude: roundCoord(position.coords.longitude) };
        onChangeRef.current({ latitude: String(next.latitude), longitude: String(next.longitude) });
        mapRef.current?.flyTo({ center: [next.longitude, next.latitude], zoom: PIN_ZOOM, essential: true });
      },
      () => {
        setLocating(false);
        setLocateMsg('Your location could not be found. Allow location for this site, or place the pin yourself.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const setTyped = (key) => (event) => onChange({ latitude, longitude, [key]: event.target.value });

  return (
    <div className="grid gap-3">
      <div className={fullScreen ? 'fixed inset-0 z-[60] flex flex-col bg-white' : 'relative'}>
        {fullScreen && (
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Tap the map to place the stop</p>
            <button type="button" onClick={() => setFullScreen(false)} className={BUTTON}><Minimize2 className="h-3.5 w-3.5" aria-hidden="true" /> Done</button>
          </div>
        )}
        <div className={fullScreen ? 'relative min-h-0 flex-1' : 'relative h-64 overflow-hidden rounded-lg border border-slate-200 sm:h-72'}>
          <div ref={containerRef} className="h-full w-full" aria-label="Map for placing the stop" role="application" />
          {issue && <MapUnavailable message={issue.message} blocking={issue.blocking} onRetry={onRetry} />}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={useMyLocation} disabled={locating} className={BUTTON}><Crosshair className="h-3.5 w-3.5" aria-hidden="true" /> {locating ? 'Finding you...' : 'Use my location'}</button>
        <button type="button" onClick={() => setFullScreen(true)} className={BUTTON}><Maximize2 className="h-3.5 w-3.5" aria-hidden="true" /> Full screen map</button>
      </div>
      {locateMsg && <p className="text-xs text-rose-700" role="alert">{locateMsg}</p>}
      <p className="text-xs text-slate-500">{pin ? 'Drag the pin or tap the map to move it.' : 'Tap the map where the stop is. Grey dots are your other stops.'}</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-medium text-slate-600">Latitude<input inputMode="decimal" value={latitude} onChange={setTyped('latitude')} className={`${INPUT} mt-1`} /></label>
        <label className="block text-xs font-medium text-slate-600">Longitude<input inputMode="decimal" value={longitude} onChange={setTyped('longitude')} className={`${INPUT} mt-1`} /></label>
      </div>
    </div>
  );
}
