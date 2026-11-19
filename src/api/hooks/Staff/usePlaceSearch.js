import { useEffect, useRef, useState } from 'react';
import OperatorService from '../../StaffService/OperatorService';

export const PLACE_MIN_CHARS = 3;
export const PLACE_DEBOUNCE_MS = 400;

/**
 * 2026-11-06 (Batch 47 part A): places for "Add stop". Suggestions come while typing (after a short pause, at least
 * PLACE_MIN_CHARS letters; the backend asks Photon and caches); search() is the Search button (the backend asks
 * Nominatim). A result only helps find the place: the stop is saved where the pin is.
 *
 * Returns { query, setQuery, results, loading, message, search, clear }.
 */
export function usePlaceSearch() {
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const requestRef = useRef(0);
  const timerRef = useRef(null);

  const run = async (q, mode) => {
    const id = ++requestRef.current;
    setLoading(true);
    try {
      const response = await OperatorService.searchPlaces(q, mode);
      if (id !== requestRef.current) return;
      const data = response?.data ?? {};
      const rows = Array.isArray(data.results) ? data.results : [];
      setResults(rows);
      if (data.available === false) {
        setMessage('Place search is not working right now. Place the pin on the map yourself.');
      } else if (rows.length === 0) {
        setMessage(mode === 'search' ? 'No place found. Try other words, or place the pin on the map yourself.' : 'No suggestions. Press Search to look further.');
      } else {
        setMessage('');
      }
    } catch {
      if (id !== requestRef.current) return;
      setResults([]);
      setMessage('Place search is not working right now. Place the pin on the map yourself.');
    } finally {
      if (id === requestRef.current) setLoading(false);
    }
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const setQuery = (value) => {
    setQueryState(value);
    clearTimeout(timerRef.current);
    const q = value.trim();
    if (q.length < PLACE_MIN_CHARS) {
      requestRef.current += 1;
      setResults([]);
      setMessage('');
      setLoading(false);
      return;
    }
    timerRef.current = setTimeout(() => { void run(q, 'suggest'); }, PLACE_DEBOUNCE_MS);
  };

  const search = () => {
    clearTimeout(timerRef.current);
    const q = query.trim();
    if (q.length < PLACE_MIN_CHARS) {
      setMessage(`Type at least ${PLACE_MIN_CHARS} letters.`);
      return;
    }
    void run(q, 'search');
  };

  const clear = () => {
    clearTimeout(timerRef.current);
    requestRef.current += 1;
    setResults([]);
    setMessage('');
    setLoading(false);
  };

  return { query, setQuery, results, loading, message, search, clear };
}
