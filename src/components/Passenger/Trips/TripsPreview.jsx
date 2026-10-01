import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import TripResults from './TripResults'
import { useAvailableTrips } from '../../../api/hooks/Passenger/useBookingSearch'
import { buildBookingQuery } from '../../../utils/bookingQuery'
import { formatManilaDate } from '../../../utils/dates'

/**
 * The home page's Available Trips preview: today's departures (Manila), narrowed live by From and To
 * once they are chosen, a handful at most (the server sets how many) with a link to every trip.
 * A different date is not listed here; it gets a link to the All Available Trips page instead.
 */
export default function TripsPreview({ today, previewLimit, date, fromCode, toCode, fromName, toName, onBook }) {
  const isToday = Boolean(today) && (!date || date === today)
  const state = useAvailableTrips({ enabled: Boolean(today) && isToday, from: fromCode, to: toCode, date: today, perPage: previewLimit })
  if (!today) return null // the server's "today" is not known yet

  const allTripsLink = (day) => `/passenger/trips?${buildBookingQuery({ from: fromCode, to: toCode, date: day })}`
  const journeyLabel = fromName && toName ? `${fromName} \u2192 ${toName}` : fromName ? `From ${fromName}` : toName ? `To ${toName}` : 'All routes'

  return (
    <section aria-labelledby="home-trips-heading" className="px-4 pt-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="home-trips-heading" className="font-display text-xl font-bold text-navy-950">Available trips</h2>
          <p className="text-sm text-slate-500">{journeyLabel}{isToday ? ' \u00b7 today' : ''}</p>
        </div>

        {isToday ? (
          <TripResults
            state={{ ...state, message: 'No more trips today for this journey.' }}
            fromName={fromName}
            toName={toName}
            seatType="seated"
            searchedDate={today}
            onBook={onBook}
            footer={state.total > 0 && (
              <div className="pt-1 text-center">
                <Link to={allTripsLink(today)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 hover:text-navy-950">
                  View all available trips{state.total > state.trips.length ? ` (${state.total})` : ''} <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            )}
          />
        ) : (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-inset ring-slate-200">
            Trips on {formatManilaDate(date)}:{' '}
            <Link to={allTripsLink(date)} className="font-semibold text-navy-800 underline">View</Link>
          </p>
        )}
        {isToday && state.total === 0 && !state.loading && !state.error && (
          <p className="mt-3 text-center">
            <Link to={allTripsLink(today)} className="text-sm font-semibold text-navy-800 underline">See other days</Link>
          </p>
        )}
      </div>
    </section>
  )
}
