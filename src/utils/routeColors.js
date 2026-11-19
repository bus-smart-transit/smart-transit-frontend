// Batch 81 (user, 2026-11-19): each route has one colour everywhere: the Operator dashboard's live fleet map and Today's
// trips, and the passengers' Track Bus map. The colour comes from the route id itself, so it never changes with which
// routes happen to be listed; the R-code (R1, R2, ...) is the route's place in the list shown.

export const ROUTE_PALETTE = ['#16a34a', '#2563eb', '#9333ea', '#dc2626', '#0891b2', '#ea580c', '#db2777', '#4d7c0f'];

/** A route's colour, from its id (the palette repeats past eight routes). */
export const routeColor = (routeId) => ROUTE_PALETTE[(Math.abs(Number(routeId) || 0) + ROUTE_PALETTE.length - 1) % ROUTE_PALETTE.length];

/** route id -> { color, code } for the given route ids ("R1" is the lowest id listed). */
export function routeColorMap(routeIds = []) {
  const ids = [...new Set(routeIds.map(Number).filter((id) => Number.isFinite(id) && id > 0))].sort((a, b) => a - b);
  return new Map(ids.map((id, index) => [id, { color: routeColor(id), code: `R${index + 1}` }]));
}
