// §4.8: the crew's time in / time out view (CrewShiftTimes).

/** "6h 15m" for minutes worked; "-" while the shift is still open. */
export function shiftLength(minutes) {
  if (minutes == null) return '-';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}
