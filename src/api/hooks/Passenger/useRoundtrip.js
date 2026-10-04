import { useEffect, useMemo, useState } from 'react'
import { getRoundtrip, readApiError } from '../../../services/bookingService'
import { roundtripPayState, validateReturnInput } from '../../../utils/roundtrip'

/**
 * Batch 28, item 4: the passenger's roundtrip choice and the server's confirmation of it. The server resolves
 * both trips (the return goes the other way, after the outbound one), prices each leg from its own trip and says
 * whether the booking can be paid; nothing here decides any of that. Not active = a one-way booking, no request.
 *
 * outbound: { mode: 'now' | 'later', date, time } is the journey the passenger has already chosen.
 */
export default function useRoundtrip({ originStopId, destinationStopId, outbound, seatType, today, maxAdvanceDays, unavailableReason = '' }) {
  const [active, setActive] = useState(false)
  const [returnDate, setReturnDate] = useState('')
  const [returnTime, setReturnTime] = useState('')
  const [result, setResult] = useState({ key: '', data: null, error: '' })

  const fieldErrors = useMemo(
    () => validateReturnInput({ outboundDate: outbound.date, outboundTime: outbound.mode === 'now' ? '' : outbound.time, returnDate, returnTime, today, maxAdvanceDays }),
    [outbound.date, outbound.mode, outbound.time, returnDate, returnTime, today, maxAdvanceDays],
  )

  const requestKey = active && originStopId && destinationStopId && outbound.date && returnDate && returnTime
    && (outbound.mode === 'now' || outbound.time) && Object.keys(fieldErrors).length === 0
    ? JSON.stringify([originStopId, destinationStopId, outbound.mode, outbound.date, outbound.time, returnDate, returnTime, seatType])
    : ''

  useEffect(() => {
    if (!requestKey) return undefined
    let cancelled = false
    const timer = setTimeout(() => {
      const params = {
        origin_stop_id: originStopId,
        destination_stop_id: destinationStopId,
        outbound_mode: outbound.mode,
        return_date: returnDate,
        return_time: returnTime,
        seat_type: seatType,
      }
      if (outbound.mode !== 'now') {
        params.outbound_date = outbound.date
        params.outbound_time = outbound.time
      }
      getRoundtrip(params)
        .then((data) => { if (!cancelled) setResult({ key: requestKey, data, error: '' }) })
        .catch((err) => { if (!cancelled) setResult({ key: requestKey, data: null, error: readApiError(err, 'The roundtrip could not be checked right now.').message }) })
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [requestKey]) // eslint-disable-line react-hooks/exhaustive-deps -- the key already carries every input

  const current = result.key === requestKey && requestKey !== ''
  const loading = Boolean(requestKey) && !current
  const data = current ? result.data : null
  const pay = roundtripPayState(data)
  const blockedReason = unavailableReason || (current && result.error) || pay.blockedReason

  return {
    active,
    setActive,
    returnDate,
    setReturnDate,
    returnTime,
    setReturnTime,
    fieldErrors,
    loading,
    data,
    error: current ? result.error : '',
    canPay: active && !unavailableReason && pay.canPay,
    blockedReason: active ? blockedReason : '',
    total: pay.total,
  }
}
