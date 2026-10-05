// Batch 28, Stage 2, item 4: roundtrip booking helpers. Pure functions, so the rules can be tested without
// rendering anything. The server is the authority on every one of them (it re-validates the dates, resolves
// both trips and recomputes both fares); these only stop a request that cannot succeed and shape the payload.
// Dates are Manila calendar dates ('YYYY-MM-DD') and times Manila wall-clock ('HH:mm'): they are compared as
// strings, never through a JS Date, so the device's timezone cannot move them.

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{2}:\d{2}$/

/** Adds whole days to a 'YYYY-MM-DD' date (calendar arithmetic in UTC, so no timezone or DST can shift it). */
export function addDays(date, days) {
  if (!DATE.test(String(date ?? ''))) return ''
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + Number(days || 0)))
  return next.toISOString().slice(0, 10)
}

/**
 * Client-side checks of the return choice. Returns { returnDate?, returnTime? } messages; empty = fine.
 * Future only (today is the server's Manila today), no later than the booking window, and after the departure.
 */
export function validateReturnInput({ outboundDate, outboundTime, returnDate, returnTime, today, maxAdvanceDays, lastBookableDate = null }) {
  const errors = {}
  const lastDate = lastBookableDate || (today && Number(maxAdvanceDays) > 0 ? addDays(today, Number(maxAdvanceDays)) : '')
  if (returnDate && !DATE.test(returnDate)) errors.returnDate = 'Choose a valid return date.'
  if (returnTime && !TIME.test(returnTime)) errors.returnTime = 'Choose a valid return time.'
  if (errors.returnDate || errors.returnTime) return errors

  if (returnDate && today && returnDate < today) {
    errors.returnDate = 'The return date has already passed (Manila time).'
  } else if (returnDate && lastDate && returnDate > lastDate) {
    errors.returnDate = `You can book up to ${maxAdvanceDays} days ahead (until ${lastDate}).`
  } else if (returnDate && outboundDate && returnDate < outboundDate) {
    errors.returnDate = 'The return must be on or after your departure date.'
  } else if (returnDate && returnTime && outboundDate && outboundTime && returnDate === outboundDate && returnTime <= outboundTime) {
    errors.returnTime = 'The return must be after your departure time.'
  }
  return errors
}

/** What the confirmation can say about paying: whether it can, why not, and the total for one passenger. */
export function roundtripPayState(data) {
  if (!data) return { canPay: false, blockedReason: '', total: null }
  if (data.can_pay === true && data.outbound && data.return) {
    return { canPay: true, blockedReason: '', total: Number(data.total_fare) }
  }
  return { canPay: false, blockedReason: data.message || 'This roundtrip cannot be booked right now.', total: null }
}

/**
 * The checkout items of a roundtrip: one outbound and one return item per passenger, each with its own trip,
 * stops and date. The client never sends a fare; the server prices each ticket from its own trip.
 */
export function buildRoundtripItems({ data, seatType, quantity }) {
  const count = Math.max(1, Number(quantity) || 1)
  const item = (leg) => ({
    trip_id: leg.trip_id,
    seat_type: seatType,
    origin_stop_id: leg.origin_stop_id,
    destination_stop_id: leg.destination_stop_id,
    booking_date: leg.trip_date,
    journey_leg: leg.journey_leg,
  })
  return [
    ...Array.from({ length: count }, () => item(data.outbound)),
    ...Array.from({ length: count }, () => item(data.return)),
  ]
}

/** The text for a leg's bus: its own label, or that it is still to be assigned (never a plate). */
export function legBusText(leg) {
  return leg?.bus_state === 'ready' && leg?.bus_label ? leg.bus_label : 'Bus to be assigned'
}
