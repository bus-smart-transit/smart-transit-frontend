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

/**
 * Batch 49 item 3: "Use in form" fills the Add form with a row's values; nothing is saved until Save. The dates and
 * the note are left empty (a copy with the same dates would only overlap the original; the server refuses overlaps
 * either way). Someone who cannot add general rules gets a fleet rule to pick a bus for.
 */
export function addFormFrom(rule, { canCreateGeneral = false } = {}) {
  const asFleet = Boolean(rule?.fleet_id) || !canCreateGeneral
  const text = (value) => (value === null || value === undefined ? '' : String(value))
  return {
    scope: asFleet ? 'fleet' : 'general',
    fleet_id: rule?.fleet_id ? String(rule.fleet_id) : '',
    vehicle_class: text(rule?.vehicle_class || rule?.fleet?.vehicle_class),
    service_type: rule?.service_type || 'regular',
    route_id: !asFleet && rule?.route_id ? String(rule.route_id) : '',
    seat_type: rule?.seat_type || 'seated',
    base_fare: text(rule?.base_fare),
    base_distance_km: text(rule?.base_distance_km),
    fare_per_km: text(rule?.fare_per_km),
    rounding_mode: text(rule?.rounding_mode),
    effective_from: '',
    effective_to: '',
    note: '',
  }
}

/** True when the Add form holds something the person typed (so replacing it needs a yes). */
export function addFormHasInput(form, emptyForm) {
  return ['fleet_id', 'vehicle_class', 'route_id', 'base_fare', 'base_distance_km', 'fare_per_km', 'rounding_mode', 'effective_from', 'effective_to', 'note']
    .some((field) => String(form?.[field] ?? '') !== String(emptyForm?.[field] ?? ''))
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
