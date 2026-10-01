import { Bus, Clock3, User } from 'lucide-react'
import Button from '../../ui/Button'
import Card from '../../ui/Card'
import { formatManilaDate } from '../../../utils/dates'
import { formatDuration } from '../../../utils/tripTimeline'

/**
 * One departure in the search results. Every value comes from the server: times are the scheduled
 * times at the chosen stops (or "unavailable"), seats are what is left, the fare is the quote from
 * the same fare service the ticket is priced with.
 */
export function TripCard({ trip, fromName, toName, seatType = 'seated', showDate = false, onBook }) {
  const duration = formatDuration(trip.duration_minutes)
  // The stops of this trip's own journey come from the server; the props are only a fallback.
  const origin = trip.origin?.name || fromName
  const destination = trip.destination?.name || toName
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          {showDate && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-700">{formatManilaDate(trip.trip_date)}</p>}
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy-950">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-navy-700" aria-hidden="true" />{origin}</span>
            <span className="text-slate-300" aria-hidden="true">&rarr;</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-teal-500" aria-hidden="true" />{destination}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Clock3 size={15} aria-hidden="true" />
              <strong className="text-navy-950">{trip.boarding_time}</strong>
              {' \u2192 '}
              {trip.arrival_time || 'arrival unavailable'}
            </span>
            {trip.plate_number && <span className="flex items-center gap-1.5"><Bus size={15} aria-hidden="true" />{trip.plate_number}</span>}
            {duration && <span>{duration}</span>}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
            <User size={15} aria-hidden="true" />
            {trip.seats_left} {seatType} seat{trip.seats_left === 1 ? '' : 's'} available
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 lg:flex-col lg:items-end lg:gap-2 lg:border-t-0 lg:pt-0">
          <div className="text-left lg:text-right">
            {Number.isFinite(Number(trip.fare)) && trip.fare !== null
              ? <><p className="font-display text-xl font-bold text-navy-950">PHP {Number(trip.fare).toFixed(2)}</p><p className="text-xs text-slate-500">per passenger</p></>
              : <p className="text-sm text-slate-500">Fare unavailable</p>}
          </div>
          <Button variant="primary" size="sm" onClick={() => onBook(trip)}>Book Seat</Button>
        </div>
      </div>
    </Card>
  )
}

/** The list under a search: loading, error, empty and the trips themselves. */
export default function TripResults({ state, fromName, toName, seatType, searchedDate, onBook, footer = null }) {
  if (state.loading) return <p className="text-sm text-slate-500" role="status">Finding trips...</p>
  if (state.error) return <p className="text-sm text-red-600" role="alert">{state.error}</p>
  if (state.trips.length === 0) {
    return <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">{state.message || 'No trips found for that journey.'}</p>
  }
  return (
    <div className="space-y-3">
      {state.trips.map((trip) => (
        <TripCard
          key={trip.trip_id}
          trip={trip}
          fromName={fromName}
          toName={toName}
          seatType={seatType}
          showDate={trip.trip_date !== searchedDate}
          onBook={onBook}
        />
      ))}
      {footer}
    </div>
  )
}
