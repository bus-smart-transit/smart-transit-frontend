import { useEffect, useState } from 'react'
import { getBookingLink, readApiError } from '../../../services/bookingService'
import { parseBookingQuery } from '../../../utils/bookingQuery'

const LEGACY_MESSAGE = 'This booking link is out of date. Search for your trip again to get a new one.'

/**
 * Reads the booking link the page was opened with (?from=<code>&to=<code>&date=...), has the
 * server check it, and hands back the journey to start from. Nothing in the URL is trusted:
 * an unknown stop, the same stop twice, or a bad/past date ends in a friendly message.
 *
 * status: 'none' (no link) | 'checking' | 'ok' (journey ready) | 'error' (message to show)
 */
export default function useBookingLink(searchParams) {
  // Only the URL the page was opened with is checked; later edits by the page itself are ours.
  const [parsed] = useState(() => parseBookingQuery(searchParams))
  const [state, setState] = useState(() => {
    if (!parsed.present) return { status: 'none', message: '', journey: null }
    if (parsed.legacy) return { status: 'error', message: LEGACY_MESSAGE, journey: null }
    return { status: 'checking', message: '', journey: null }
  })

  const checking = state.status === 'checking'
  useEffect(() => {
    if (!checking) return undefined
    let cancelled = false
    getBookingLink({ from: parsed.from, to: parsed.to, date: parsed.date })
      .then((link) => {
        if (cancelled) return
        // The link carries only the stops and the day. Book Now / Book Later is page state: today
        // starts as Book Now, any other day can only be Book Later (the page decides).
        setState({
          status: 'ok',
          message: '',
          link,
          journey: {
            origin_stop_id: String(link.from.stop_id),
            destination_stop_id: String(link.to.stop_id),
            booking_option: 'now',
            booking_date: link.date,
            // A trip chosen from the results (?time=HH:MM) opens Book Later with that departure.
            ...(parsed.time ? { booking_option: 'later', booking_time: parsed.time } : {}),
          },
        })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', message: readApiError(err, 'We could not check this booking link.').message, journey: null })
      })
    return () => { cancelled = true }
  }, [checking, parsed])

  return state
}
