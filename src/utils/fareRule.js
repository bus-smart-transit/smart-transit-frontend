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

// 2026-11-06: Copy and Edit on the fare screen. Dates are Manila calendar days ('YYYY-MM-DD'); the server decides.

const addDays = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const dayOf = (value) => (value ? String(value).slice(0, 10) : null)

/** Has the rule started (in force today or before)? A rule with no start date has always been in force. */
export function ruleStarted(rule, today) {
  const from = dayOf(rule?.effective_from)
  return from === null || from <= today
}

/** The earliest start a copy may have: tomorrow, and after the original's start (never the same day). */
export function earliestCopyStart(rule, today) {
  const tomorrow = addDays(today, 1)
  const from = dayOf(rule?.effective_from)
  if (from === null) return tomorrow
  const dayAfterFrom = addDays(from, 1)
  return dayAfterFrom > tomorrow ? dayAfterFrom : tomorrow
}

/** The original's last day once a copy starts on copyStart (the day before). */
export const originalEndsOn = (copyStart) => addDays(copyStart, -1)

/** The copy form, filled from the rule (prices kept, so only what changes needs typing). */
export function copyFormFrom(rule, today) {
  return {
    effective_from: earliestCopyStart(rule, today),
    effective_to: '',
    base_fare: rule?.base_fare ?? '',
    fare_per_km: rule?.fare_per_km ?? '',
    base_distance_km: rule?.base_distance_km ?? '',
    note: rule?.note ?? '',
  }
}

/** The copy request body: numbers as numbers, empty end date left out. */
export function buildCopyPayload(form) {
  const payload = { effective_from: form.effective_from, base_fare: Number(form.base_fare), fare_per_km: Number(form.fare_per_km) }
  payload.base_distance_km = form.base_distance_km === '' || form.base_distance_km === null ? null : Number(form.base_distance_km)
  if (form.effective_to) payload.effective_to = form.effective_to
  if (String(form.note ?? '').trim()) payload.note = String(form.note).trim()
  return payload
}

/** "Nov 6, 2026, 4:40 PM" in Manila time (no zone label), or "Not provided". */
export function formatUpdatedAt(value) {
  if (!value) return 'Not provided'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not provided'
  return date.toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}
