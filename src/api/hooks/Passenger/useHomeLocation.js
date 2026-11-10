import { useEffect, useMemo, useState } from 'react';
import { getRegionPlace } from '../../../services/regionService';
import { getTrips } from '../../../services/bookingService';
import { locationQuestion, nearestStop, stopIdsByDistance } from '../../../utils/homeLocation';

const ANSWER_KEY = 'st-home-location-answer';

const readAnswer = () => {
  try { return window.sessionStorage.getItem(ANSWER_KEY) || ''; } catch { return ''; }
};
const saveAnswer = (value) => {
  try { window.sessionStorage.setItem(ANSWER_KEY, value); } catch { /* private window: ask again next time */ }
};

/**
 * Batch 51 items 2 and 3 (user, 2026-11-09): on landing, the homepage asks for the passenger's location. Allowed: it
 * asks "Are you in {place}?" (the town from the server, from a point rounded to about 1 km) and, on Yes, the list
 * starts at the nearest stop within `radiusKm` (measured on the device). Refused or unanswered: every trip is listed.
 * The answer is kept for this browser session only.
 *
 * Batch 52 item 1: when the town is known, Yes gives the area ({ town, province, prefer: stop ids nearest first }) and
 * the list shows every trip you can board there; without a town, the nearest stop as before.
 *
 * @returns {{ question: string, nearest: object|null, note: string, accept: () => { area: object|null, stop: object|null }, decline: () => void }}
 */
export default function useHomeLocation(groups, radiusKm = 5) {
  const [answered, setAnswered] = useState(() => readAnswer());
  const [coords, setCoords] = useState(null);
  const [place, setPlace] = useState(null);
  const [placeLoaded, setPlaceLoaded] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (answered || typeof navigator === 'undefined' || !navigator.geolocation) return undefined;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        const point = { lat: Number(position.coords.latitude), lng: Number(position.coords.longitude) };
        setCoords(point);
        getRegionPlace(point.lat, point.lng)
          .then((found) => { if (!cancelled) setPlace(found); })
          .catch(() => {})
          .finally(() => { if (!cancelled) setPlaceLoaded(true); });
      },
      () => { /* refused or unavailable: every trip stays listed */ },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
    return () => { cancelled = true; };
  }, [answered]);

  const nearest = useMemo(() => nearestStop(groups, coords, radiusKm), [groups, coords, radiusKm]);
  const question = !answered && coords && placeLoaded ? locationQuestion(place, nearest) : '';

  // Batch 53 item 4: the pop-up shows a loading animation while the place is being found.
  const locating = !answered && Boolean(coords) && !placeLoaded;

  return {
    question,
    locating,
    nearest,
    note,
    /** Batch 53 item 4: whether the area has any trip today (town, then province). */
    hasTrips: async (area, date) => {
      for (const params of [area?.town ? { town: area.town } : null, area?.province ? { province: area.province } : null].filter(Boolean)) {
        try {
          const data = await getTrips({ ...params, date, per_page: 1, seat_type: 'seated', prefer: area.prefer || undefined });
          if ((data?.total ?? 0) > 0) return true;
        } catch { return true; /* unknown: let the list try */ }
      }
      return false;
    },
    accept: () => {
      saveAnswer('yes');
      setAnswered('yes');
      if (place?.place) {
        setNote('');
        return { area: { town: place.place, province: place.province || '', prefer: stopIdsByDistance(groups, coords).join(',') }, stop: null };
      }
      setNote(nearest ? `Showing trips from ${nearest.stop.name}, the nearest stop to you.` : `No bus stop within ${radiusKm} km of you, so every trip is shown.`);
      return { area: null, stop: nearest?.stop ?? null };
    },
    decline: () => {
      saveAnswer('no');
      setAnswered('no');
      setNote('');
    },
  };
}
