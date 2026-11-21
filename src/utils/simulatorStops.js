// 2026-11-21 (user, demo): the GPS simulator marks stops as reached for the Driver, one at a time.

/** The first stop after the last one reached (the first stop when none is reached yet); null at the end of the route. */
export function nextStopToReach(stops = [], lastId = null) {
  const list = Array.isArray(stops) ? stops : [];
  const at = lastId == null ? -1 : list.findIndex((stop) => Number(stop.stop_id) === Number(lastId));
  return list[at + 1] ?? null;
}
