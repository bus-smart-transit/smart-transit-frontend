// Batch 81 (user, 2026-11-19): the Operator dashboard colours each route the same on the live fleet map and in Today's
// trips (R1, R2, ...). Colours are given by route id order, so a route keeps its colour between refreshes.

export const ROUTE_PALETTE = ['#16a34a', '#2563eb', '#9333ea', '#dc2626', '#0891b2', '#ea580c', '#db2777', '#4d7c0f'];

/** route id -> { color, code } for the given route ids ("R1" is the lowest id). Repeats the palette past eight. */
export function routeColorMap(routeIds = []) {
  const ids = [...new Set(routeIds.map(Number).filter((id) => Number.isFinite(id) && id > 0))].sort((a, b) => a - b);
  return new Map(ids.map((id, index) => [id, { color: ROUTE_PALETTE[index % ROUTE_PALETTE.length], code: `R${index + 1}` }]));
}
