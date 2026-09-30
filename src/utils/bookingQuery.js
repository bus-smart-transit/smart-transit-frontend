/** The query string the booking page reads to pre-fill the journey a passenger searched for. */
export function buildBookingQuery(journey) {
  const params = new URLSearchParams();
  if (journey.origin_stop_id) params.set('origin_stop_id', journey.origin_stop_id);
  if (journey.destination_stop_id) params.set('destination_stop_id', journey.destination_stop_id);
  params.set('mode', journey.booking_option === 'later' ? 'later' : 'now');
  if (journey.booking_option === 'later') {
    if (journey.booking_date) params.set('date', journey.booking_date);
    if (journey.booking_time) params.set('time', journey.booking_time);
  }
  return params.toString();
}