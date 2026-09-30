import { useEffect, useState } from 'react'
import { getBookingStops, getDepartures, getTrips, readApiError, resolveTrip } from '../../../services/bookingService'

/**
 * Where a passenger can board and get off, computed on the server from data (C3).
 * Origins are every stopping stop on a route with an active fleet; once an
 * origin is chosen, destinations narrow to the routes that serve it.
 */
export function useBookingStops(originStopId) {
  const [origins, setOrigins] = useState({ ready: false, groups: [], meta: null, error: '' })
  const [destinations, setDestinations] = useState({ key: null, groups: [], error: '' })
  const destinationKey = originStopId ? String(originStopId) : null

  useEffect(() => {
    let cancelled = false
    getBookingStops()
      .then((data) => { if (!cancelled) setOrigins({ ready: true, groups: data?.groups ?? [], meta: data?.meta ?? null, error: '' }) })
      .catch((err) => { if (!cancelled) setOrigins({ ready: true, groups: [], meta: null, error: readApiError(err, 'Stops could not be loaded.').message }) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!destinationKey) return undefined
    let cancelled = false
    getBookingStops(destinationKey)
      .then((data) => { if (!cancelled) setDestinations({ key: destinationKey, groups: data?.groups ?? [], error: '' }) })
      .catch((err) => { if (!cancelled) setDestinations({ key: destinationKey, groups: [], error: readApiError(err, 'Destinations could not be loaded.').message }) })
    return () => { cancelled = true }
  }, [destinationKey])

  const destinationsReady = destinationKey !== null && destinations.key === destinationKey
  return {
    originGroups: origins.groups,
    // Today in Manila and the booking window, from the server, for the date picker.
    today: origins.meta?.today ?? '',
    maxAdvanceDays: origins.meta?.max_advance_days ?? null,
    destinationGroups: destinationsReady ? destinations.groups : [],
    loadingOrigins: !origins.ready,
    loadingDestinations: destinationKey !== null && !destinationsReady,
    error: origins.error || (destinationsReady ? destinations.error : ''),
  }
}

/**
 * D3: there is no trip picker. The server resolves the trip for a journey (Book
 * Now = next eligible departure, Book Later = earliest on/after the chosen
 * Manila date and time). Returns { trip, message } or an error to show.
 */
export function useTripResolution({ mode, originStopId, destinationStopId, date, time, seatType }) {
  const ready = Boolean(originStopId && destinationStopId && (mode === 'now' || (date && time)))
  const key = ready ? [mode, originStopId, destinationStopId, mode === 'later' ? date : '', mode === 'later' ? time : '', seatType].join('|') : null
  const [result, setResult] = useState({ key: null, trip: null, message: '', error: '' })

  useEffect(() => {
    if (!key) return undefined
    let cancelled = false
    const params = { mode, origin_stop_id: originStopId, destination_stop_id: destinationStopId, seat_type: seatType }
    if (mode === 'later') {
      params.date = date
      params.time = time
    }
    resolveTrip(params)
      .then((data) => { if (!cancelled) setResult({ key, trip: data?.trip ?? null, message: data?.message ?? '', error: '' }) })
      .catch((err) => { if (!cancelled) setResult({ key, trip: null, message: '', error: readApiError(err, 'We could not look up departures right now.').message }) })
    return () => { cancelled = true }
    // key encodes every input used above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const current = result.key === key
  return {
    trip: current ? result.trip : null,
    message: current ? result.message : '',
    error: current ? result.error : '',
    loading: key !== null && !current,
    ready,
  }
}

/**
 * Book Later: the departures of one Manila date that fit the journey, for the passenger to
 * choose from. Returns { departures, message, loading, error }; idle (no request) when disabled.
 */
export function useDepartures({ enabled, originStopId, destinationStopId, date, seatType }) {
  const ready = Boolean(enabled && originStopId && destinationStopId && date)
  const key = ready ? [originStopId, destinationStopId, date, seatType].join('|') : null
  const [result, setResult] = useState({ key: null, departures: [], message: '', error: '' })

  useEffect(() => {
    if (!key) return undefined
    let cancelled = false
    getDepartures({ origin_stop_id: originStopId, destination_stop_id: destinationStopId, date, seat_type: seatType })
      .then((data) => { if (!cancelled) setResult({ key, departures: data?.departures ?? [], message: data?.message ?? '', error: '' }) })
      .catch((err) => { if (!cancelled) setResult({ key, departures: [], message: '', error: readApiError(err, 'We could not look up departures right now.').message }) })
    return () => { cancelled = true }
    // key encodes every input used above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const current = result.key === key
  return {
    departures: current ? result.departures : [],
    message: current ? result.message : '',
    error: current ? result.error : '',
    loading: key !== null && !current,
    ready,
  }
}
/**
 * The search results list: the next trips for a journey from a Manila date on (short list with a
 * limit, every match without one). `search` is { originStopId, destinationStopId, date, seatType } or
 * null while nothing has been searched. Returns { trips, total, message, loading, error }.
 */
export function useTripSearch(search, limit = null) {
  const key = search?.originStopId && search?.destinationStopId && search?.date
    ? [search.originStopId, search.destinationStopId, search.date, search.seatType || 'seated', limit ?? 'all'].join('|')
    : null
  const [result, setResult] = useState({ key: null, trips: [], total: 0, message: '', error: '' })

  useEffect(() => {
    if (!key) return undefined
    let cancelled = false
    const params = {
      origin_stop_id: search.originStopId,
      destination_stop_id: search.destinationStopId,
      date: search.date,
      seat_type: search.seatType || 'seated',
    }
    if (limit) params.limit = limit
    getTrips(params)
      .then((data) => { if (!cancelled) setResult({ key, trips: data?.trips ?? [], total: data?.total ?? 0, message: data?.message ?? '', error: '' }) })
      .catch((err) => { if (!cancelled) setResult({ key, trips: [], total: 0, message: '', error: readApiError(err, 'We could not look up trips right now.').message }) })
    return () => { cancelled = true }
    // key encodes every input used above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const current = result.key === key
  return {
    trips: current ? result.trips : [],
    total: current ? result.total : 0,
    message: current ? result.message : '',
    error: current ? result.error : '',
    loading: key !== null && !current,
    searched: key !== null,
  }
}
