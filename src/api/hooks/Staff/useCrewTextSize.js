import { useCallback, useEffect, useState } from 'react';

/**
 * Batch 61 (advisor, via the user, 2026-11-13): the crew choose how big the text and buttons are, for drivers with poor
 * eyesight. The whole crew portal scales with it (every size is in rem), so nothing has to be resized by hand. The
 * choice is kept on this phone only (a per-device convenience); it never reaches the server.
 */
export const CREW_TEXT_SIZES = [
  { key: 'normal', label: 'Normal', px: 16 },
  { key: 'large', label: 'Large', px: 18 },
  { key: 'xlarge', label: 'Extra large', px: 20 },
];
export const DEFAULT_CREW_TEXT_SIZE = 'large';
const STORAGE_KEY = 'smarttransit.crewTextSize';

export const crewTextSizePx = (key) => (CREW_TEXT_SIZES.find((size) => size.key === key) ?? CREW_TEXT_SIZES[1]).px;

function readSaved() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return CREW_TEXT_SIZES.some((size) => size.key === saved) ? saved : DEFAULT_CREW_TEXT_SIZE;
  } catch {
    return DEFAULT_CREW_TEXT_SIZE;
  }
}

export default function useCrewTextSize() {
  const [size, setSizeState] = useState(readSaved);

  // While a crew portal is open the page's root font size follows the choice; leaving puts it back.
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.fontSize;
    root.style.fontSize = `${crewTextSizePx(size)}px`;
    return () => { root.style.fontSize = before; };
  }, [size]);

  const setSize = useCallback((next) => {
    if (!CREW_TEXT_SIZES.some((entry) => entry.key === next)) return;
    setSizeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage: the choice lasts until the page closes.
    }
  }, []);

  return { size, setSize, sizes: CREW_TEXT_SIZES };
}
