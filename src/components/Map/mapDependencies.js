// 2026-11-19 (package update to MapLibre 6): the map's background worker is its own file now. MapLibre looks for it
// next to its own code, which Vite moves, so the build ships the worker as a file and the map is told where it is.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

let mapLibLoadPromise;

export function loadMapLib() {
  if (!mapLibLoadPromise) {
    // MapLibre 6 has only named exports (no default); every map reads `{ default: maplibregl }`.
    mapLibLoadPromise = import('maplibre-gl').then((mod) => {
      const maplibregl = Object.keys(mod).includes('default') ? mod.default : mod;
      if (typeof maplibregl.setWorkerUrl === 'function') maplibregl.setWorkerUrl(workerUrl);
      return { default: maplibregl };
    });
  }
  return mapLibLoadPromise;
}

export async function preloadMapDependencies() {
  await loadMapLib();
}
