// Batch 81 (user, 2026-11-19): each route has one colour everywhere: the Operator dashboard's live fleet map and Today's
// trips, and the passengers' Track Bus map. The R-code (R1, R2, ...) is the route's place in the list shown.
// 2026-11-21 (user): the server now keeps each route's own colour (never one another route uses) and sends it as
// route.color / route_color. The colour from the route id below is only a fallback for a route without one.

export const ROUTE_PALETTE = ['#16a34a', '#2563eb', '#9333ea', '#dc2626', '#0891b2', '#ea580c', '#db2777', '#4d7c0f'];

const HEX = /^#[0-9a-f]{6}$/i;

/** A route's colour: its saved colour when it has one, otherwise one from its id (that palette repeats past eight). */
export const routeColor = (routeId, saved = null) => (HEX.test(String(saved || '')) ? saved : ROUTE_PALETTE[(Math.abs(Number(routeId) || 0) + ROUTE_PALETTE.length - 1) % ROUTE_PALETTE.length]);

/**
 * route id -> { color, code } for the given route ids ("R1" is the lowest id listed). savedColors maps a route id to
 * its saved colour (a Map or a plain object).
 */
export function routeColorMap(routeIds = [], savedColors = {}) {
  const savedOf = (id) => (savedColors instanceof Map ? savedColors.get(id) : savedColors?.[id]);
  const ids = [...new Set(routeIds.map(Number).filter((id) => Number.isFinite(id) && id > 0))].sort((a, b) => a - b);
  return new Map(ids.map((id, index) => [id, { color: routeColor(id, savedOf(id)), code: `R${index + 1}` }]));
}
