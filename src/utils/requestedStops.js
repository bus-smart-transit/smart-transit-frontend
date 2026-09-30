// Display grouping for a leg's requested stops (custom drop-offs). The server places each one
// (after_stop_sequence): N = after stop N of the leg, 0 = before the first stop, null with
// position_known false = cannot be placed. None of them is ever left out of the screen.

/** @returns {{ before: object[], after: Record<number, object[]>, unknown: object[] }} */
export function groupRequestedStops(requestedStops) {
  const groups = { before: [], after: {}, unknown: [] }
  ;(Array.isArray(requestedStops) ? requestedStops : []).forEach((requested) => {
    const after = requested?.after_stop_sequence
    if (requested?.position_known === false || after === null || after === undefined) {
      groups.unknown.push(requested)
    } else if (Number(after) === 0) {
      groups.before.push(requested)
    } else {
      const key = Number(after)
      groups.after[key] = [...(groups.after[key] || []), requested]
    }
  })
  return groups
}
