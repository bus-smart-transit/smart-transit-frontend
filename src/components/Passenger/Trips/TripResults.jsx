import { Bus, Clock3, User } from 'lucide-react'
import Button from '../../ui/Button'
import Card from '../../ui/Card'
import { formatManilaDate } from '../../../utils/dates'
import { formatDuration } from '../../../utils/tripTimeline'
import { busLabelText } from '../../../utils/busLabel'
import { FARE_UNAVAILABLE } from '../../../utils/serviceType'
import RunInfoChips from '../../ui/RunInfoChips'
import RouteStops from './RouteStops'
import { isDeparted, seatsLeftText, tripProgressText } from '../../../utils/passengerTripProgress'

import { SkeletonCards } from '../../ui/Skeleton'
/**
 * One departure in the search results. Every value comes from the server: times are the scheduled
 * times at the chosen stops (or "unavailable"), seats are what is left, the fare is the quote from
 * the same fare service the ticket is priced with.
 */
export function TripCard({ trip, fromName, toName, showDate = false, onBook, onChooseDropOff = null }) {
  const duration = formatDuration(trip.duration_minutes)
  // The stops of this trip's own journey come from the server; the props are only a fallback.
  const origin = trip.origin?.name || fromName
  const destination = trip.destination?.name || toName
  const progressText = tripProgressText(trip.progress)
  const departed = isDeparted(trip.progress)
  // Batch 54 (user): once the Driver presses Start Boarding the card says so plainly.
  const nowBoarding = trip.progress?.state === 'boarding'
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          {nowBoarding && (
            <p data-testid="trip-now-boarding" className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-800">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden="true" />
              Now boarding
            </p>
          )}
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
            <span className="flex items-center gap-1.5" data-testid="trip-bus-label"><Bus size={15} aria-hidden="true" />{busLabelText(trip.bus_label)}</span>
            {trip.vehicle_class_label && <span data-testid="trip-bus-type" className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{trip.vehicle_class_label}</span>}
            <RunInfoChips runPattern={trip.run_pattern} service={trip.service} serviceType={trip.service_type} showStops />
            {duration && <span>{duration}</span>}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
            <User size={15} aria-hidden="true" />
            {seatsLeftText(trip.seats_left)}
          </p>
          {/* Batch 49 item 2: a bus that has left shows where it is; from a stop it has passed it reads "Departed". */}
          {progressText && !nowBoarding && (
            <p data-testid="trip-progress" className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${departed ? 'bg-slate-100 text-slate-600' : 'bg-teal-50 text-teal-700'}`}>
              {progressText}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 lg:flex-col lg:items-end lg:gap-2 lg:border-t-0 lg:pt-0">
          <div className="text-left lg:text-right">
            {Number.isFinite(Number(trip.fare)) && trip.fare !== null
              ? <><p className="font-display text-xl font-bold text-navy-950">PHP {Number(trip.fare).toFixed(2)}</p><p className="text-xs text-slate-500">per passenger</p></>
              : <p className="text-sm text-slate-500">Fare unavailable</p>}
          </div>
          <Button variant="primary" size="sm" onClick={() => onBook(trip)} disabled={trip.bookable === false}>
            {departed ? 'Departed' : trip.bookable === false ? FARE_UNAVAILABLE : 'Book Seat'}
          </Button>
        </div>
      </div>
      {/* Batch 54 (user): every stop with its time, and another drop-off, on All available trips only. */}
      {onChooseDropOff && <RouteStops trip={trip} onChooseDropOff={onChooseDropOff} />}
    </Card>
  )
}

/** The list under a search: loading, error, empty and the trips themselves. */
export default function TripResults({ state, fromName, toName, searchedDate, onBook, onChooseDropOff = null, footer = null }) {
  if (state.loading) return <SkeletonCards label="Finding trips..." count={3} />
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
          showDate={trip.trip_date !== searchedDate}
          onBook={onBook}
          onChooseDropOff={onChooseDropOff}
        />
      ))}
      {footer}
    </div>
  )
}
