// Batch 28, item 5: the body of a "save fare rule" request from the fare form. Only what the form holds goes
// out, with numbers as numbers; every value is validated again by the server, and no fare value lives here.

/** A fleet rule is an override for one bus; a general rule carries a vehicle class (and optionally a route). */
export function buildFareRulePayload(form) {
  const payload = {
    seat_type: form.seat_type,
    service_type: form.service_type || undefined,
    base_fare: Number(form.base_fare),
    fare_per_km: Number(form.fare_per_km),
  }
  if (form.scope === 'fleet') {
    payload.fleet_id = Number(form.fleet_id)
    if (form.vehicle_class) payload.vehicle_class = form.vehicle_class
  } else {
    payload.vehicle_class = form.vehicle_class
    if (form.route_id) payload.route_id = Number(form.route_id)
  }
  if (form.base_distance_km !== '') payload.base_distance_km = Number(form.base_distance_km)
  if (form.rounding_mode) payload.rounding_mode = form.rounding_mode
  if (form.effective_from) payload.effective_from = form.effective_from
  if (form.effective_to) payload.effective_to = form.effective_to
  if (String(form.note ?? '').trim()) payload.note = String(form.note).trim()
  return payload
}
