let mapLibLoadPromise;

export function loadMapLib() {
  if (!mapLibLoadPromise) {
    mapLibLoadPromise = import('maplibre-gl');
  }
  return mapLibLoadPromise;
}

export async function preloadMapDependencies() {
  await loadMapLib();
}
