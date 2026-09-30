// Central map/GPS thresholds (Batch 24). One place for every tunable so no
// component carries its own magic number. Override per deployment with the
// VITE_* variables; the defaults mirror backend config/route_geometry.php.
// Region-level values (name, centre, bounding box) are NOT here: they come from
// the server region config via services/regionService.js.

const num = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && value !== '' && value != null ? parsed : fallback
}

export const MAP_CONFIG = {
  // Padding (degrees) added around a route's bounds when scoping landmark search.
  routeSearchPaddingDeg: num(import.meta.env?.VITE_ROUTE_SEARCH_PADDING_DEG, 0.1),
  // Position older than this shows "Last seen X ago" (operator/passenger/driver).
  staleAfterSeconds: num(import.meta.env?.VITE_GPS_STALE_AFTER_S, 120),
  // Fixes with a larger accuracy radius are treated as weak and ignored.
  maxAccuracyM: num(import.meta.env?.VITE_GPS_MAX_ACCURACY_M, 100),
  // Farther than this from the route line = "not on route".
  onRouteThresholdM: num(import.meta.env?.VITE_ROUTE_ON_THRESHOLD_M, 75),
  // Beyond this the vehicle is excluded from the fit-to-route bounds.
  nearRouteM: num(import.meta.env?.VITE_ROUTE_NEAR_THRESHOLD_M, 500),
  // Cache lifetime for canonical geometry / stops fetched by the map layer.
  routeCacheTtlMs: num(import.meta.env?.VITE_ROUTE_CACHE_TTL_MS, 5 * 60 * 1000),
}
