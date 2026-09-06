import { MapPin, Clock, Bus, Users, Loader, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';

const toCompactTime = (value) => {
  if (!value) return '--:--';
  const str = String(value).trim();
  const match = str.match(/^(\d{2}:\d{2})(?::\d{2})?$/);
  return match ? match[1] : str;
};

const formatTripDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
};

const resolveTripBaseFare = (trip) => {
  const directFare = Number(trip?.fare ?? trip?.base_fare ?? trip?.fleet_route?.base_fare);
  if (Number.isFinite(directFare) && directFare > 0) return directFare;

  const fareRules = trip?.fleet_route?.fleet?.fare_rules || trip?.fleet_route?.fleet?.fareRules || [];
  const fares = fareRules
    .map((rule) => Number(rule?.base_fare))
    .filter((value) => Number.isFinite(value) && value > 0);

  return fares.length > 0 ? Math.min(...fares) : null;
};

function TripCard({ trip, index, onBookSeat }) {
  const route = trip.fleet_route?.route ?? trip.fleet_route ?? {};
  const fleet = trip.fleet_route?.fleet ?? {};
  const origin = route?.origin_stop?.stop_name ?? trip.fleet_route?.origin_stop_name ?? 'Origin';
  const destination = route?.destination_stop?.stop_name ?? trip.fleet_route?.destination_stop_name ?? 'Destination';
  const startTime = toCompactTime(trip.fleet_route?.start_time ?? trip.start_time);
  const endTime = toCompactTime(trip.fleet_route?.end_time ?? trip.end_time);
  const busName = fleet?.plate_number ?? fleet?.name ?? `Bus ${index + 1}`;
  const seatedLeft = trip.available_seated_capacity ?? trip.remaining_seated_capacity ?? 10;
  const standingLeft = trip.available_standing_capacity ?? trip.remaining_standing_capacity ?? 0;
  const totalLeft = seatedLeft + standingLeft;
  const listedFare = resolveTripBaseFare(trip);
  const hasListedFare = Number.isFinite(listedFare) && listedFare > 0;

  return (
    <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow-md">
      {/* Number */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
        {index + 1}
      </div>

      {/* Route info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900">
          {origin} <span className="text-slate-400">→</span> {destination}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {startTime} – {endTime}
          </span>
          <span className="flex items-center gap-1">
            <Bus className="h-3.5 w-3.5 shrink-0" />
            {busName}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 shrink-0" />
            {totalLeft} seat{totalLeft !== 1 ? 's' : ''} available
          </span>
        </div>
      </div>

      {/* Price + actions */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="text-right">
          <p className="text-lg font-bold text-slate-900">
            {hasListedFare ? `₱${listedFare.toFixed(0)}` : 'Fare depends on drop-off'}
          </p>
          <p className="text-xs text-slate-400">{hasListedFare ? 'base fare per passenger' : 'select drop-off to see exact price'}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-teal-300 hover:text-teal-600"
          >
            <MapPin className="h-3.5 w-3.5" />
            Track Live
          </button>
          <button
            type="button"
            onClick={() => onBookSeat(trip)}
            className="rounded-lg bg-[#0D1B2A] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            Book Seat
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TripResultsSection({ trips, loading, error, searchState, onBookSeat }) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const origin = searchState?.from?.toUpperCase() || 'ALL TERMINALS';
  const dest = searchState?.to?.toUpperCase() || 'ALL DESTINATIONS';
  const dateLabel = searchState?.date
    ? formatTripDate(searchState.date)
    : new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });

  const filteredTrips = useMemo(() => {
    const list = Array.isArray(trips) ? trips : [];
    if (statusFilter === 'all') return list;
    return list.filter((trip) => {
      const status = String(trip?.status || '').toLowerCase();
      if (statusFilter === 'scheduled') {
        return ['scheduled', 'delayed', 'boarding', 'departed', 'in-progress'].includes(status);
      }
      if (statusFilter === 'completed') {
        return ['completed', 'alighted'].includes(status);
      }
      return true;
    });
  }, [statusFilter, trips]);

  const displayTrips = filteredTrips.slice(0, 10);
  const hasActiveSearch = Boolean(searchState?.from || searchState?.to || searchState?.date);

  return (
    <section className="bg-slate-50 px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
              All Available Trips
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              {origin} TO {dest}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Travel Date: {dateLabel}
              {!loading && trips !== null && (
                <span className="ml-3 font-semibold text-slate-700">
                  {displayTrips.length} trip{displayTrips.length !== 1 ? 's' : ''} found
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="landing-trip-status-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Trip Filter
            </label>
            <select
              id="landing-trip-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="all">All</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
            </select>
            {!loading && displayTrips.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/passenger/book')}
                className="rounded-lg bg-[#0D1B2A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                View All Trips
              </button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader className="h-6 w-6 animate-spin mr-3" />
            <span>Searching trips...</span>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* No results */}
        {!loading && !error && trips !== null && displayTrips.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <Bus className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-600">No trips found</p>
            <p className="mt-1 text-sm text-slate-400">
              {hasActiveSearch
                ? 'No trips match the selected route and date. Try broadening the search.'
                : 'There are no scheduled trips available at the moment.'}
            </p>
          </div>
        )}

        {/* Trip cards */}
        {!loading && !error && displayTrips.length > 0 && (
          <div className="space-y-3">
            {displayTrips.map((trip, i) => (
              <TripCard key={trip.id ?? i} trip={trip} index={i} onBookSeat={onBookSeat} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
