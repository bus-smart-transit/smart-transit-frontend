// §4.8 and Batch 46: the crew's time in / time out view (CrewShiftTimes).

export const MAX_RANGE_DAYS = 31;

/** "6h 15m" for minutes worked; "-" while the shift is still open. */
export function shiftLength(minutes) {
  if (minutes == null) return '-';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

/** Batch 46: "7 h 30 min" for hours worked; "0 min" for none. */
export function hoursWorked(minutes) {
  const total = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** How many days From..To covers (both included); 0 when the range is not valid. */
export function rangeDays(from, to) {
  if (!from || !to || to < from) return 0;
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86400000) + 1;
}

/** A plain message when the range cannot be asked for, else ''. */
export function rangeProblem(from, to) {
  if (!from || !to) return 'Choose both dates.';
  if (to < from) return 'The end date must be on or after the start date.';
  if (rangeDays(from, to) > MAX_RANGE_DAYS) return `Choose at most ${MAX_RANGE_DAYS} days.`;
  return '';
}

/** "Nov 4" for the day a shift ended when it is a later day than it started (it crossed midnight). */
export function endedOnLabel(isoDate) {
  if (!isoDate) return '';
  const date = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}
