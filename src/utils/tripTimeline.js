// Pure display logic for the passenger trip timeline (A2). The server decides
// every row, ETA, journey flag and fare; this only groups rows for display.

/** 95 -> "1 h 35 min", 40 -> "40 min", null -> null. */
export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined || !Number.isFinite(Number(minutes))) return null
  const total = Math.max(0, Math.round(Number(minutes)))
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours === 0) return `${mins} min`
  return mins === 0 ? `${hours} h` : `${hours} h ${mins} min`
}

/** Manila wall-clock "HH:mm" carried by the server as `eta_time`; null means "ETA unavailable". */
export function etaLabel(row) {
  return row?.eta_time || null
}

const isPassThrough = (row) => row.type === 'pass_through'
const isPinned = (row) => row.is_boarding || row.is_alighting || row.custom

/**
 * Turns the server's flat rows into display items.
 *
 * - A run of `collapseMin`+ consecutive pass-through rows becomes one
 *   collapsible group ("N stops"), so the noise between real stops folds away.
 * - Once a journey is chosen, a run of `collapseMin`+ consecutive rows that lie
 *   outside it (before boarding / after getting off) also folds into one group.
 * - Boarding, alighting and custom rows are never folded.
 *
 * Returns [{ kind: 'row', row } | { kind: 'group', id, reason, rows }].
 */
export function groupTimelineRows(rows, collapseMin) {
  const list = Array.isArray(rows) ? rows : []
  const threshold = Math.max(2, Number(collapseMin) || 3)
  const hasJourney = list.some((row) => row.is_boarding || row.is_alighting)

  const foldable = (row) => !isPinned(row) && (
    (hasJourney && row.in_journey === false) || isPassThrough(row)
  )
  const reasonOf = (row) => (hasJourney && row.in_journey === false ? 'outside' : 'pass_through')

  const items = []
  let i = 0
  while (i < list.length) {
    if (!foldable(list[i])) {
      items.push({ kind: 'row', row: list[i] })
      i += 1
      continue
    }

    const reason = reasonOf(list[i])
    let j = i
    while (j < list.length && foldable(list[j]) && reasonOf(list[j]) === reason) j += 1

    const run = list.slice(i, j)
    if (run.length >= threshold) {
      items.push({ kind: 'group', id: `${reason}:${run[0].stop_id}`, reason, rows: run })
    } else {
      run.forEach((row) => items.push({ kind: 'row', row }))
    }
    i = j
  }
  return items
}

/** Row visual state for the node/legend: passed | current | upcoming, plus journey overlays. */
export function nodeState(row) {
  if (row.custom) return 'custom'
  if (row.progress === 'passed') return 'passed'
  if (row.progress === 'current') return 'current'
  return 'upcoming'
}

/** Seconds between refreshes; never below 5s whatever the server says. */
export function pollIntervalMs(refresh) {
  const seconds = Number(refresh?.poll_interval_seconds)
  return Math.max(5, Number.isFinite(seconds) && seconds > 0 ? seconds : 30) * 1000
}

/** The journey summary line pieces for the header; null values are simply omitted. */
export function journeyFacts(timeline) {
  const header = timeline?.header || {}
  const facts = []
  const duration = formatDuration(header.duration_minutes)
  if (duration) facts.push({ label: 'Duration', value: duration })
  if (header.stops_between !== null && header.stops_between !== undefined) {
    facts.push({ label: 'Stops between', value: String(header.stops_between) })
  }
  if (header.distance_km !== null && header.distance_km !== undefined) {
    facts.push({ label: 'Distance', value: `${Number(header.distance_km).toFixed(1)} km` })
  }
  return facts
}
