// Corridor name derived from a route's own stops: the distinct municipalities
// they sit in, in travel order (e.g. "Town A – Town B – Town C"). Stop data
// comes from the database; when no stop has a municipality there is no name.

const municipalityOf = (stop) => String(stop?.municipality ?? stop?.stop?.municipality ?? '').trim()

const orderOf = (stop, index) => {
  const raw = stop?.sequence_number ?? stop?.stop_order ?? stop?.sequence
  const n = Number(raw)
  return Number.isFinite(n) ? n : index
}

/** @param {Array<object>} stops route stops (with `municipality`, optionally nested under `.stop`) */
export function deriveCorridorName(stops) {
  if (!Array.isArray(stops) || stops.length === 0) return null

  const ordered = stops
    .map((stop, index) => ({ stop, order: orderOf(stop, index) }))
    .sort((a, b) => a.order - b.order)

  const names = []
  for (const { stop } of ordered) {
    const municipality = municipalityOf(stop)
    if (municipality && names[names.length - 1] !== municipality && !names.includes(municipality)) {
      names.push(municipality)
    }
  }

  return names.length > 0 ? names.join(' – ') : null
}
