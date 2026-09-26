import { MapPin, Clock, Bus, Users, Loader, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { parseAppDate } from '../../../utils/dates';

const toCompactTime = (value) => {
  if (!value) return '--:--';
  const str = String(value).trim();
  const match = str.match(/^(\d{2}:\d{2})(?::\d{2})?$/);
  return match ? match[1] : str;
};

const formatTripDate = (dateStr) => {
  if (!dateStr) return '-';
  const parsed = parseAppDate(dateStr);
  if (!parsed) return dateStr;
  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Batch 19 Part D: "Class" reuses the existing fleet_type distinction
// (public/private) already used elsewhere (e.g. standing-capacity rules in
// BuyTicket) rather than introducing a new schema field — confirmed with
// the reporter that public/private terminology is an acceptable stand-in
// for an economy/premium-style class tier.
const resolveTripClassLabel = (trip) => {
  const fleetType = String(trip?.fleet_route?.fleet?.fleet_type || '').toLowerCase();
  if (fleetType === 'private') return 'Private';
  if (fleetType === 'public') return 'Public';
  return 'Standard';
};

// No per-trip duration is stored anywhere in the schema (confirmed during
// Batch 17/18 investigation). Estimate using the route's total distance
// (last stop's distance_from_origin_km) against the same 38 km/h average
// speed already assumed elsewhere in the driver-facing trip summaries,
// rather than inventing a second, inconsistent assumption.
const AVERAGE_SPEED_KMH = 38;

const resolveTripEstimatedDuration = (trip) => {
  const routeStops = trip?.fleet_route?.route?.route_stops || trip?.fleet_route?.route?.routeStops || [];
  if (!Array.isArray(routeStops) || routeStops.length === 0) return null;
  const distances = routeStops
    .map((stop) => Number(stop?.distance_from_origin_km))
    .filter((value) => Number.isFinite(value) && value >= 0);
  if (distances.length === 0) return null;
  const totalKm = Math.max(...distances);
  if (totalKm <= 0) return null;
  const totalMinutes = Math.round((totalKm / AVERAGE_SPEED_KMH) * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

function TripCard({ trip, index, onBookSeat }) {
  const route = trip.fleet_route?.route ?? trip.fleet_route ?? {};
  const fleet = trip.fleet_route?.fleet ?? {};
  const origin = route?.origin_stop?.stop_name ?? trip.fleet_route?.origin_stop_name ?? 'Origin';
  const destination = route?.destination_stop?.stop_name ?? trip.fleet_route?.destination_stop_name ?? 'Destination';
  // This trip's actual scheduled departure time — NOT fleet_route.start_time/
  // end_time, which is the fleet route's general daily operating-hours
  // window (e.g. 05:00-21:00) and was being shown here instead of the
  // specific trip's departure time (e.g. 7:30).
  const departureTime = toCompactTime(trip?.departure_time || trip?.fleet_route?.start_time);
  const busName = fleet?.plate_number ?? fleet?.name ?? `Bus ${index + 1}`;
  // Backend stores current_* as OCCUPIED counts (not remaining), so
  // available capacity must be derived as total - current, mirroring
  // BuyTicket.jsx's toSeatAvailability(). The previous available_seated_capacity/
  // remaining_seated_capacity fields don't exist on the API response, so
  // this always silently fell back to a hardcoded "10 seats available".
  const seatedTotal = Number(fleet?.seated_capacity ?? 0);
  const standingTotal = Number(fleet?.standing_capacity ?? 0);
  const explicitSeatedAvailable = trip.available_seated_capacity ?? trip.available_seated ?? trip.remaining_seated_capacity;
  const explicitStandingAvailable = trip.available_standing_capacity ?? trip.available_standing ?? trip.remaining_standing_capacity;
  const seatedLeft = explicitSeatedAvailable != null
    ? Number(explicitSeatedAvailable)
    : Math.max(0, seatedTotal - Number(trip?.current_seated_capacity ?? 0));
  const standingLeft = explicitStandingAvailable != null
    ? Number(explicitStandingAvailable)
    : Math.max(0, standingTotal - Number(trip?.current_standing_capacity ?? 0));
  const totalLeft = seatedLeft + standingLeft;
  const classLabel = resolveTripClassLabel(trip);
  const estimatedDuration = resolveTripEstimatedDuration(trip);
  const statusLabel = String(trip?.status || 'scheduled').toLowerCase();
  const statusToneClass = statusLabel === 'boarding'
    ? 'bg-emerald-100 text-emerald-700'
    : statusLabel === 'delayed'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-slate-100 text-slate-600';

  return (
    <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow-md">
      {/* Number */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
        {index + 1}
      </div>

      {/* Route info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-900">
            {origin} <span className="text-slate-400">→</span> {destination}
          </p>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-600">
            {classLabel}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${statusToneClass}`}>
            {statusLabel}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {departureTime}
          </span>
          {estimatedDuration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              ~{estimatedDuration}
            </span>
          )}
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

      {/* Batch 19 Part D: fare is intentionally not shown on this
          browsing/listing view — it only appears once the passenger
          reaches the quote/payment step (BuyTicket), which also keeps
          the displayed price from ever drifting out of sync with the
          actual computed/charged fare (Batch 15 Item 10 concern). */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <p className="text-xs text-slate-400">View fare at checkout</p>
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
            className="rounded-lg bg-navy-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-navy-900"
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
  const origin = searchState?.from?.toUpperCase() || 'ALL TERMINALS';
  const dest = searchState?.to?.toUpperCase() || 'ALL DESTINATIONS';
  const dateLabel = searchState?.date
    ? formatTripDate(searchState.date)
    : new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });

  const displayTrips = useMemo(() => (Array.isArray(trips) ? trips.slice(0, 10) : []), [trips]);
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
            {!loading && displayTrips.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/passenger/book')}
                className="rounded-lg bg-navy-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-900"
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
              <TripCard key={trip.trip_id ?? i} trip={trip} index={i} onBookSeat={onBookSeat} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
