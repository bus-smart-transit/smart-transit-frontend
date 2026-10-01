import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import TripResults from './TripResults'
import { useAvailableTrips } from '../../../api/hooks/Passenger/useBookingSearch'
import { buildBookingQuery } from '../../../utils/bookingQuery'
import { formatManilaDate } from '../../../utils/dates'

/**
 * The home page's Available Trips list, a handful at most (the server sets how many):
 * - after Search, the journey that was searched, on the day that was searched;
 * - before any search, today's (Manila) departures, narrowed live by From and To once they are chosen.
 *   A different date is not listed live; it gets a link to the All Available Trips page instead.
 * Either way "See all available trips" opens the All Available Trips page for the same journey and day.
 *
 * `live` = { date, fromCode, toCode, fromName, toName } (the card as it is now);
 * `search` = the same shape, frozen at the moment Search was pressed, or null.
 */
export default function TripsPreview({ today, previewLimit, live, search, onBook }) {
  const view = search || live
  const listed = Boolean(search) || !live.date || live.date === today
  const queryDate = search ? search.date : today
  const state = useAvailableTrips({ enabled: Boolean(today) && listed, from: view.fromCode, to: view.toCode, date: queryDate, perPage: previewLimit })
  if (!today) return null // the server's "today" is not known yet

  const allTripsLink = (day) => `/passenger/trips?${buildBookingQuery({ from: view.fromCode, to: view.toCode, date: day })}`
  const journeyLabel = view.fromName && view.toName ? `${view.fromName} \u2192 ${view.toName}` : view.fromName ? `From ${view.fromName}` : view.toName ? `To ${view.toName}` : 'All routes'
  const dayLabel = search ? formatManilaDate(search.date) : 'today'
  const emptyMessage = search ? 'No trips match this journey on that day.' : 'No more trips today for this journey.'

  return (
    <section aria-labelledby="home-trips-heading" className="px-4 pt-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="home-trips-heading" className="font-display text-xl font-bold text-navy-950">Available trips</h2>
          <p className="text-sm text-slate-500">{journeyLabel}{listed ? ` \u00b7 ${dayLabel}` : ''}</p>
        </div>

        {listed ? (
          <TripResults
            state={{ ...state, message: emptyMessage }}
            fromName={view.fromName}
            toName={view.toName}
            seatType="seated"
            searchedDate={queryDate}
            onBook={onBook}
            footer={state.total > 0 && (
              <div className="pt-1 text-center">
                <Link to={allTripsLink(queryDate)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 hover:text-navy-950">
                  See all available trips{state.total > state.trips.length ? ` (${state.total})` : ''} <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            )}
          />
        ) : (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-inset ring-slate-200">
            Trips on {formatManilaDate(live.date)}:{' '}
            <Link to={allTripsLink(live.date)} className="font-semibold text-navy-800 underline">View</Link>
          </p>
        )}
        {listed && state.total === 0 && !state.loading && !state.error && (
          <p className="mt-3 text-center">
            <Link to={allTripsLink(queryDate)} className="text-sm font-semibold text-navy-800 underline">See all available trips</Link>
          </p>
        )}
      </div>
    </section>
  )
}
