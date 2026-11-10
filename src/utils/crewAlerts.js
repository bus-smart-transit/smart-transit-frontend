// Batch 58 (user, 2026-11-10): how crew alerts ("Alert operator") read on the screens. Pure, so it is tested alone.
// Every value comes from the server (TripAlertService::present); a missing one reads "Not provided".

export const NOT_PROVIDED = 'Not provided'

/** "Driver" or "Chauffeur" (the conductor role is shown as Chauffeur everywhere). */
export function crewRoleLabel(role) {
  return role === 'conductor' ? 'Chauffeur' : 'Driver'
}

/** "TA-01 · Ta Route" (body number, else plate). */
export function alertBusText(alert) {
  const trip = alert?.trip || {}
  const bus = trip.body_no || trip.plate_number || NOT_PROVIDED
  return trip.route_name ? `${bus} · ${trip.route_name}` : bus
}

/** A map link for where the bus was, or null when the place is not known. */
export function alertMapLink(alert) {
  const lat = Number(alert?.latitude)
  const lng = Number(alert?.longitude)
  if (alert?.latitude == null || alert?.longitude == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`
}

/** "From the phone" / "From the bus's last GPS report" / null. */
export function alertPlaceSource(alert) {
  if (alert?.location_source === 'phone') return "From the crew's phone"
  if (alert?.location_source === 'gps') return "From the bus's last GPS report"
  return null
}

/** What the crew member sees after sending. */
export function crewAlertStatusText(alert) {
  if (!alert) return ''
  if (alert.status === 'cancelled') return 'You took this alert back.'
  if (alert.status === 'handled') return alert.handled_note ? `Your operator handled this alert. Note: ${alert.handled_note}` : 'Your operator handled this alert.'
  return 'Alert sent. Your operator has been told. Call them if you need help now.'
}

export function telHref(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '')
  return digits ? `tel:${digits}` : null
}
