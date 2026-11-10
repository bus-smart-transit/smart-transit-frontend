import { useCallback, useEffect, useState } from 'react';

const ASKED_KEY = 'st_trips_location_asked';
const readAsked = () => { try { return window.sessionStorage.getItem(ASKED_KEY) === '1'; } catch { return false; } };
const saveAsked = () => { try { window.sessionStorage.setItem(ASKED_KEY, '1'); } catch { /* private window: asked again next visit */ } };

/**
 * Batch 54 (user, 2026-11-10): the passenger's position for "Stops near you" on All available trips. When the browser
 * has not been allowed yet, a pop-up asks first (once a visit); an allowed browser is read quietly. The position stays
 * on this device: it is only used to measure distances here.
 * status: 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable'
 */
export default function useNearbyLocation() {
  const supported = typeof navigator !== 'undefined' && Boolean(navigator.geolocation);
  const [status, setStatus] = useState(supported ? 'idle' : 'unavailable');
  const [coords, setCoords] = useState(null);
  const [askOpen, setAskOpen] = useState(false);

  const locate = useCallback(() => {
    if (!supported) return;
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: Number(position.coords.latitude), lng: Number(position.coords.longitude) });
        setStatus('ready');
      },
      (error) => setStatus(error?.code === 1 ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, [supported]);

  useEffect(() => {
    if (!supported) return undefined;
    let cancelled = false;
    const decide = (state) => {
      if (cancelled) return;
      if (state === 'granted') locate();
      else if (state === 'denied') setStatus('denied');
      else if (!readAsked()) setAskOpen(true);
    };
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => decide(result.state)).catch(() => decide('prompt'));
    } else {
      decide('prompt');
    }
    return () => { cancelled = true; };
  }, [supported, locate]);

  return {
    status,
    coords,
    askOpen,
    allow: () => { saveAsked(); setAskOpen(false); locate(); },
    notNow: () => { saveAsked(); setAskOpen(false); },
    locate,
  };
}
