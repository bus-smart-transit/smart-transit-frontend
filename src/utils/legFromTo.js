/**
 * 2026-11-20 (user's production test): the "{from} → {to}" of a trip leg. A route is stored in its outbound direction;
 * a return leg (leg_direction 'reverse') runs it the other way, so its from and to swap. Null when either end is
 * unknown.
 */
export function legFromTo(route, legDirection) {
  const origin = String(route?.origin ?? '').trim();
  const destination = String(route?.destination ?? '').trim();
  if (!origin || !destination) return null;
  return String(legDirection ?? 'outbound') === 'reverse' ? `${destination} → ${origin}` : `${origin} → ${destination}`;
}
