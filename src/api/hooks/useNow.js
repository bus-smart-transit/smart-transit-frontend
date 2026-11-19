import { useState, useEffect } from 'react';

/** The current time in ms, refreshed on an interval, so "last seen", stale-GPS and "opens at" states keep moving. */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
