// Batch 28 Stage 3, item 8: the two facts about a bus run, shown wherever a trip is shown. Everything here is
// formatting of what the server derived from stored data (run pattern from the schedule / shift block; service and the
// stops an express serves from the route's stop data). Nothing is derived or invented on the client.

/** The server's schedule label, or '' when no schedule information was sent. */
export function runPatternLabel(runPattern) {
  return typeof runPattern?.label === 'string' ? runPattern.label : ''
}

/** "Regular", "Express" or "Express - Non-stop" as the server worded it; falls back to the plain service type. */
export function serviceLabel(service, serviceType) {
  if (typeof service?.label === 'string' && service.label) return service.label
  return String(serviceType ?? '').toLowerCase() === 'express' ? 'Express' : serviceType ? 'Regular' : ''
}

/** "Stops at: A, B, D" for an express trip's served stops; '' for a regular trip or when none are recorded. */
export function servedStopsText(service) {
  const names = (service?.served_stops ?? []).map((stop) => stop?.name).filter(Boolean)
  if (service?.type !== 'express' || names.length === 0) return ''
  return `${service.non_stop ? 'Serves only' : 'Stops at'}: ${names.join(', ')}`
}

/** The run info of a record that may carry it as `run_info` (trips, tickets, QR data) or as top-level fields (cards, booking list). */
export function pickRunInfo(record) {
  const info = record?.run_info ?? {}
  return {
    runPattern: info.run_pattern ?? record?.run_pattern ?? null,
    service: info.service ?? record?.service ?? null,
  }
}
