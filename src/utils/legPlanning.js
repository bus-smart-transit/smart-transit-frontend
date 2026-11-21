/**
 * 2026-10-27 (smarttransit_prompt.md §4.2): small view rules for duration-based leg planning. The server plans, checks
 * and decides; these only shape what the Operator sees.
 */

export const MAX_LEGS = 8;

/** The flags (overtime, driving limit, rest, night work) the server returned, as one line after a save. */
export function planningMessage(base, flags) {
  const list = Array.isArray(flags) ? flags.filter((flag) => flag?.message) : [];
  if (list.length === 0) return base;
  return `${base} Check: ${list.map((flag) => flag.message).join(' ')}`;
}

/** Only a leg that has not started boarding can be moved (the server checks again). */
export function canMoveLeg(leg) {
  return ['scheduled', 'delayed'].includes(leg?.status);
}

/** "06:00:00" or "06:00" -> "06:00" for a time input. */
export function legTimeValue(time) {
  return typeof time === 'string' ? time.slice(0, 5) : '';
}

/** One more empty leg, up to the most a block may have. */
export function addLeg(times) {
  const list = Array.isArray(times) ? times : [];
  return list.length >= MAX_LEGS ? list : [...list, ''];
}

/** The last leg removed, keeping at least one. */
export function removeLastLeg(times) {
  const list = Array.isArray(times) ? times : [];
  return list.length <= 1 ? list : list.slice(0, -1);
}

// 2026-11-21 (user, Dynamic Route Scheduling): every schedule goes out and comes back, so legs come in pairs
// (outbound, inbound): at least 2, always an even number (the server checks again).

/** One more out-and-back pair of empty legs, up to the most a block may have. */
export function addRoundTrip(times) {
  const list = Array.isArray(times) ? times : [];
  return list.length + 2 > MAX_LEGS ? list : [...list, '', ''];
}

/** The last out-and-back pair removed, keeping at least one pair. */
export function removeRoundTrip(times) {
  const list = Array.isArray(times) ? times : [];
  return list.length <= 2 ? list : list.slice(0, -2);
}

/** A suggested list cut to an even number of legs (an odd last leg is dropped), keeping at least two. */
export function evenLegs(times) {
  const list = Array.isArray(times) ? times : [];
  return list.length > 2 && list.length % 2 === 1 ? list.slice(0, -1) : list;
}

/** "Outbound" for legs 1, 3, 5... and "Inbound" for 2, 4, 6... (index from 0). */
export const legDirectionLabel = (index) => (index % 2 === 0 ? 'Outbound' : 'Inbound');
