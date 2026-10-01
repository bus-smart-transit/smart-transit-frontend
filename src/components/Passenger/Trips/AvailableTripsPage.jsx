import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import JourneyFields from '../BuyTicket/JourneyFields'
import TripResults from './TripResults'
import Button from '../../ui/Button'
import { useAvailableTrips, useBookingStops } from '../../../api/hooks/Passenger/useBookingSearch'
import { findStopCode, findStopId, tripBookingPath } from '../../../utils/bookingQuery'
import { formatManilaDate } from '../../../utils/dates'

const read = (params, key) => String(params.get(key) || '').trim()

/**
 * All Available Trips: the departures of one Manila date (today unless the address says otherwise),
 * paginated by the server, for a journey given as readable stop codes. From, To and Date can be
 * edited here; the address is the single source of truth, so a refresh or a shared link shows the
 * same list. Unknown stops, the same stop twice or a bad date come back from the server as a message.
 */
export default function AvailableTripsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const from = read(params, 'from').toLowerCase()
  const to = read(params, 'to').toLowerCase()
  const date = read(params, 'date')
  const page = Math.max(1, parseInt(read(params, 'page'), 10) || 1)

  const stops = useBookingStops('', from)
  const originId = findStopId(stops.originGroups, from)
  const destinationId = findStopId(stops.destinationGroups, to)

  // The list is requested once the server's settings (page size, today) are known.
  const ready = Boolean(stops.today) || Boolean(stops.error)
  const results = useAvailableTrips({
    enabled: ready,
    from,
    to,
    date,
    page,
    perPage: stops.tripsPerPage,
  })

  const update = (changes, { keepPage = false } = {}) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    if (!keepPage) next.delete('page')
    setParams(next, { replace: true })
  }

  const handleChange = (field, value) => {
    if (field === 'origin_stop_id') update({ from: findStopCode(stops.originGroups, value), to: '' })
    else if (field === 'destination_stop_id') update({ to: findStopCode(stops.destinationGroups, value) })
    else if (field === 'booking_date') update({ date: value })
  }

  const shownDate = results.date || date || stops.today
  const loading = results.loading || !ready
  const noTrips = !loading && !results.error && results.trips.length === 0

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/passenger#search-trips" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-800 transition hover:text-navy-950">
            <ArrowLeft size={16} aria-hidden="true" /> Back to Search
          </Link>
          <h1 className="font-display text-base font-bold text-navy-950 sm:text-lg">All Available Trips</h1>
          <span className="w-24" aria-hidden="true" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
        <section aria-label="Edit your search" className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-200">
          <JourneyFields
            value={{ origin_stop_id: originId, destination_stop_id: destinationId, booking_date: date || stops.today }}
            originGroups={stops.originGroups}
            destinationGroups={stops.destinationGroups}
            loadingDestinations={stops.loadingDestinations}
            today={stops.today}
            maxAdvanceDays={stops.maxAdvanceDays}
            onChange={handleChange}
            idPrefix="trips"
          />
        </section>

        {results.error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
            <span>{results.error}</span>
            <Link to="/passenger/trips" className="font-semibold text-navy-800 underline">Clear search</Link>
          </div>
        )}

        {!results.error && (
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-bold text-navy-950">
                {results.from?.name || results.to?.name
                  ? `${results.from?.name || 'Any stop'} \u2192 ${results.to?.name || 'Any stop'}`
                  : 'All routes'}
              </h2>
              {shownDate && <p className="text-sm text-slate-500">{formatManilaDate(shownDate)} (Manila time)</p>}
            </div>
            {!loading && (
              <p className="text-sm font-medium text-slate-500">{results.total} trip{results.total === 1 ? '' : 's'} found</p>
            )}
          </div>
        )}

        {!results.error && !noTrips && (
          <TripResults
            state={{ ...results, loading, message: '' }}
            seatType="seated"
            searchedDate={shownDate}
            onBook={(trip) => navigate(tripBookingPath(trip))}
            footer={results.lastPage > 1 && (
              <nav aria-label="Trip pages" className="flex items-center justify-center gap-3 pt-2">
                <Button variant="outline" size="sm" icon={ChevronLeft} disabled={results.page <= 1} onClick={() => update({ page: String(results.page - 1) }, { keepPage: true })}>
                  Previous
                </Button>
                <span className="text-sm font-medium text-slate-600" aria-live="polite">Page {results.page} of {results.lastPage}</span>
                <Button variant="outline" size="sm" icon={ChevronRight} iconPosition="right" disabled={results.page >= results.lastPage} onClick={() => update({ page: String(results.page + 1) }, { keepPage: true })}>
                  Next
                </Button>
              </nav>
            )}
          />
        )}

        {noTrips && (
          <div className="rounded-xl bg-white px-4 py-4 text-sm text-slate-600 ring-1 ring-slate-200">
            {results.nextAvailableDate ? (
              <p className="flex flex-wrap items-center gap-3">
                <span>No trips on this date. Next available: <strong className="text-navy-950">{formatManilaDate(results.nextAvailableDate)}</strong></span>
                <Button variant="primary" size="sm" onClick={() => update({ date: results.nextAvailableDate })}>Show that day</Button>
              </p>
            ) : (
              <p>No trips on this date, and none further ahead for this journey.</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
