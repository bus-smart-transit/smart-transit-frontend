// 2026-11-13 (user): the Driver's Trip page shows ONE stop at a time, so the Driver does not scroll while driving.
// Before the bus leaves, the stop is the starting terminal (its button is Start boarding, then Depart). On the road it
// is the first stop not yet reached after the terminal (its button is Acknowledge). Once the last stop is reached it
// stays on the last stop and the button is End Trip. The server still checks every action.

const norm = (value) => String(value || '').toLowerCase();
const NOT_LEFT = ['scheduled', 'delayed', 'boarding'];
const RUNNING = ['departed', 'in-progress'];

const seqOf = (stop, index) => stop?.sequence_number ?? stop?.stop_order ?? index + 1;

/**
 * Which stop the Driver's stop card shows.
 * Returns { phase: 'start' | 'onRoad' | 'end' | 'none', index, stop, total, previousSeq, following } where
 * `previousSeq` is the sequence number of the stop before it (null for the first) and `following` is the stop after it.
 */
export function driverStopFocus({ stops = [], tripStatus = '' } = {}) {
  const list = Array.isArray(stops) ? stops : [];
  const total = list.length;
  if (total === 0) return { phase: 'none', index: -1, stop: null, total: 0, previousSeq: null, following: null };

  const status = norm(tripStatus);
  let phase = 'none';
  let index = total - 1;
  if (NOT_LEFT.includes(status)) {
    phase = 'start';
    index = 0;
  } else if (RUNNING.includes(status)) {
    // The bus has left the terminal, so the terminal is never the stop to tap, even when it was not acknowledged.
    const ahead = list.findIndex((stop, i) => i > 0 && !stop?.is_acknowledged);
    if (ahead === -1 && list[total - 1]?.is_acknowledged) {
      phase = 'end';
      index = total - 1;
    } else {
      phase = 'onRoad';
      index = ahead === -1 ? total - 1 : ahead;
    }
  }

  return {
    phase,
    index,
    stop: list[index] ?? null,
    total,
    previousSeq: index > 0 ? seqOf(list[index - 1], index - 1) : null,
    following: list[index + 1] ?? null,
  };
}

/** The name a stop is shown by. */
export function stopLabel(stop, index = 0) {
  return stop?.stop_name ?? stop?.name ?? `Stop ${index + 1}`;
}
