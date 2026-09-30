import { useEffect, useState } from 'react'
import { getBookingLink, readApiError } from '../../../services/bookingService'
import { parseBookingQuery } from '../../../utils/bookingQuery'
import { getBusinessToday } from '../../../utils/dates'

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
        // Today (Manila) can be booked now; a later date is Book Later. The mode lives in the page.
        const later = link.date !== getBusinessToday() || Boolean(parsed.time)
        setState({
          status: 'ok',
          message: '',
          journey: {
            origin_stop_id: String(link.from.stop_id),
            destination_stop_id: String(link.to.stop_id),
            booking_option: later ? 'later' : 'now',
            booking_date: later ? link.date : '',
            booking_time: later ? parsed.time : '',
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
