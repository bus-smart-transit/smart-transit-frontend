import api from './api.js'

// Thin wrappers over the public, read-only passenger booking endpoints. Every
// value (destinations, resolved trip, ETAs, fare, snapped drop-off) is computed
// by the server; nothing here derives places or times of its own.

const data = (response) => response?.data?.data ?? null

/** { message, fieldErrors } from an axios error, whatever shape the server used. */
export function readApiError(error, fallback = 'Something went wrong. Please try again.') {
  const body = error?.response?.data
  const fieldErrors = body?.errors && typeof body.errors === 'object' ? body.errors : {}
  const firstField = Object.values(fieldErrors).flat()[0]
  return {
    message: firstField || body?.message || error?.message || fallback,
    fieldErrors,
  }
}

/** Boarding/alighting candidates grouped by municipality; pass an origin to narrow to routes serving it. */
export async function getBookingStops(originStopId = null) {
  const response = await api.get('/booking/stops', { params: originStopId ? { origin_stop_id: originStopId } : {} })
  return data(response)
}

/** Checks the untrusted parts of a booking link (stop codes, date). Resolves to { from, to, date } or rejects with a friendly 422. */
export async function getBookingLink({ from, to, date }) {
  const params = {}
  if (from) params.from = from
  if (to) params.to = to
  if (date) params.date = date
  const response = await api.get('/booking/link', { params })
  return data(response)
}

/** Book Now / Book Later: the server picks the trip. params: { mode, origin_stop_id, destination_stop_id, date?, time?, seat_type? } */
export async function resolveTrip(params) {
  const response = await api.get('/booking/resolve', { params })
  return data(response)
}

/** Book Later: every eligible departure of one Manila date for the journey. params: { origin_stop_id, destination_stop_id, date, seat_type? } */
export async function getDepartures(params) {
  const response = await api.get('/booking/departures', { params })
  return data(response)
}

/** Timeline for a trip, recomputed for the chosen boarding/alighting stop or custom drop-off pin. */
export async function getTripTimeline(tripId, selection = {}) {
  const params = {}
  Object.entries(selection).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') params[key] = value
  })
  const response = await api.get(`/trips/${tripId}/timeline`, { params })
  return data(response)
}

/** Address search proxy for the custom drop-off map (restricted to the region server-side). */
export async function searchAddress(query) {
  const response = await api.get('/booking/address-search', { params: { q: query } })
  return data(response)?.results ?? []
}

/** Read-only payment state for the checkout return page; the webhook is the source of truth. */
export async function getPaymentStatus(reference) {
  const response = await api.get('/payments/status', { params: { ref: reference } })
  return data(response)
}
