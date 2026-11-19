/**
 * Batch 49 item 2: what a passenger reads about a trip in the search results, from the server's `progress` (null
 * before the bus leaves). A next stop the server does not know reads "Not provided", never a guess.
 */
export function tripProgressText(progress) {
  if (!progress?.state) return null
  if (progress.state === 'on_the_way') return `On the way · Next stop: ${progress.next_stop || 'Not provided'}`
  return progress.label || null
}

/** True when the trip has left the passenger's stop, so it cannot be booked from there. */
export function isDeparted(progress) {
  return progress?.state === 'departed'
}

/** Batch 49 item 2: seats are counted for the whole bus (not per stop), and the label says so. */
export function seatsLeftText(count) {
  const n = Number(count)
  if (!Number.isFinite(n)) return 'Seats left: Not provided'
  return `${n} seat${n === 1 ? '' : 's'} left on this bus`
}
