import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import useBookingLink from '../../../api/hooks/Passenger/useBookingLink'
import { useTripSearch } from '../../../api/hooks/Passenger/useBookingSearch'
import TripResults from './TripResults'
import { buildBookingQuery } from '../../../utils/bookingQuery'
import { formatManilaDate } from '../../../utils/dates'

/**
 * Every available trip for a journey from a chosen date on, earliest first, grouped by day. The link
 * (?from=<code>&to=<code>&date=...) is checked by the server first, so a bad or out-of-date link shows
 * a message with a way back to search.
 */
export default function AvailableTripsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const bookingLink = useBookingLink(searchParams)
  const link = bookingLink.link

  const results = useTripSearch(
    link
      ? { originStopId: String(link.from.stop_id), destinationStopId: String(link.to.stop_id), date: link.date, seatType: 'seated' }
      : null,
  )

  const bookTrip = (trip) => {
    navigate(`/passenger/book?${buildBookingQuery({ from: link.from.stop_code, to: link.to.stop_code, date: trip.trip_date, time: trip.boarding_time })}`)
  }

  const byDay = results.trips.reduce((days, trip) => {
    (days[trip.trip_date] ||= []).push(trip)
    return days
  }, {})

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
        {bookingLink.status === 'checking' && <p className="text-sm text-slate-500" role="status">Checking your search...</p>}

        {(bookingLink.status === 'error' || bookingLink.status === 'none') && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
            <span>{bookingLink.status === 'none' ? 'Choose where you board, where you get off and the day to see trips.' : bookingLink.message}</span>
            <Link to="/passenger#search-trips" className="font-semibold text-navy-800 underline">Search for a trip</Link>
          </div>
        )}

        {link && (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="font-display text-xl font-bold text-navy-950">{link.from.name} &rarr; {link.to.name}</h2>
                <p className="text-sm text-slate-500">From {formatManilaDate(link.date)} (Manila time)</p>
              </div>
              {!results.loading && !results.error && (
                <p className="text-sm font-medium text-slate-500">{results.total} trip{results.total === 1 ? '' : 's'} found</p>
              )}
            </div>

            {Object.keys(byDay).length > 0 ? (
              Object.entries(byDay).map(([day, trips]) => (
                <section key={day} aria-label={formatManilaDate(day)}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-700">{formatManilaDate(day)}</h3>
                  <TripResults
                    state={{ trips, loading: false, error: '', message: '' }}
                    fromName={link.from.name}
                    toName={link.to.name}
                    seatType="seated"
                    searchedDate={day}
                    onBook={bookTrip}
                  />
                </section>
              ))
            ) : (
              <TripResults state={results} fromName={link.from.name} toName={link.to.name} seatType="seated" searchedDate={link.date} onBook={bookTrip} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
