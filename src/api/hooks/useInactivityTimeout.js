import { useEffect, useRef } from 'react';

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'wheel'];
const CHECK_EVERY_MS = 15000;

/**
 * Calls onTimeout once nobody has touched the screen for `minutes`. The last touch is remembered and compared on a short
 * interval, so a laptop that slept (timers frozen) signs out as soon as it wakes instead of waiting a full period again.
 * Nothing runs when `minutes` is 0 or missing.
 */
export default function useInactivityTimeout({ minutes, onTimeout }) {
  const lastActivity = useRef(0);
  const callback = useRef(onTimeout);

  useEffect(() => {
    callback.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!minutes) return undefined;
    const limitMs = minutes * 60 * 1000;
    lastActivity.current = Date.now();

    const touch = () => { lastActivity.current = Date.now(); };
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, touch, { passive: true }));

    const timer = setInterval(() => {
      if (Date.now() - lastActivity.current >= limitMs) {
        clearInterval(timer);
        callback.current?.();
      }
    }, CHECK_EVERY_MS);

    return () => {
      clearInterval(timer);
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, touch));
    };
  }, [minutes]);
}
