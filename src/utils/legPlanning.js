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
