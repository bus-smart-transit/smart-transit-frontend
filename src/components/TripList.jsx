import { useMemo, useState } from "react";
import { UserIcon, ClockIcon, MapPinIcon, BusIcon } from "./Icons.jsx";
import RouteStops from "./RouteStops.jsx";
import Button from "./ui/Button.jsx";
import Card from "./ui/Card.jsx";
import TripFilters from "./TripFilters.jsx";
import DepartureStatus from "./DepartureStatus.jsx";
import { formatTravelDay, manilaToday } from "../utils/departureStatus.js";
import { applyFilters, busTypeLabel, defaultFilters } from "../utils/tripFilters.js";

// One trip: route, times, bus, seats, fare, Book Trip, and the
// "View Route Stops" panel where the passenger can pick a drop-off.
export function TripCard({ trip, travelDate, onBookSeat }) {
  const [stopsOpen, setStopsOpen] = useState(false);
  const [dropOff, setDropOff] = useState(null);

  return (
    <Card className="overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy-950">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-navy-700" />
                {trip.origin}
              </span>
              <MapPinIcon size={14} className="text-slate-300" />
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                {trip.destination}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <ClockIcon size={15} />
                {trip.departure} → {trip.arrival}
              </span>
              <span className="flex items-center gap-1.5">
                <BusIcon size={15} />
                {trip.bus}
              </span>
              <span>{trip.duration}</span>
              {busTypeLabel(trip) && (
                <span className="rounded-full bg-navy-50 px-2 py-0.5 text-xs font-semibold text-navy-800">
                {busTypeLabel(trip)}
              </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <UserIcon size={15} />
                {trip.seatsAvailable} seats available
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 lg:flex-col lg:items-end lg:gap-2 lg:border-t-0 lg:pt-0">
            <div className="text-left lg:text-right">
              <p className="font-display text-xl font-bold text-navy-950">₱{trip.fare}</p>
              <p className="text-xs text-slate-500">per passenger</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => onBookSeat(trip, dropOff)}>
              Book Trip
            </Button>
          </div>
        </div>

        <DepartureStatus
          trip={trip}
          travelDate={travelDate ?? manilaToday()}
          className="mt-4"
        />
      </div>

      <RouteStops
        trip={trip}
        open={stopsOpen}
        onToggle={() => setStopsOpen((open) => !open)}
        dropOffId={dropOff}
        onDropOffChange={setDropOff}
      />
    </Card>
  );
}

// "All Available Trips". origin/destination are shown only after a search.
// travelDate is the searched "YYYY-MM-DD"; without one, trips are today's (Manila).
export default function TripList({ trips, origin, destination, travelDate, onBookSeat, onShowAll }) {
  const day = travelDate || manilaToday();
  const [filters, setFilters] = useState(defaultFilters);
  const shown = useMemo(() => applyFilters(trips, filters), [trips, filters]);
  const clearAll = () => setFilters(defaultFilters());

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-navy-950">All Available Trips</h2>
        <p className="text-sm font-medium text-slate-500" aria-live="polite">
          {shown.length === trips.length
            ? `${trips.length} ${trips.length === 1 ? "trip" : "trips"} found`
            : `${shown.length} of ${trips.length} trips match`}
        </p>
      </div>
      {origin || destination ? (
        <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-navy-700">
          {(origin ?? "Any origin").toUpperCase()} TO {(destination ?? "Any destination").toUpperCase()}
        </p>
      ) : (
        <p className="mt-1 text-sm text-slate-500">Every trip you can book. Use Search Trips to narrow it down.</p>
      )}
      <p className="text-sm text-slate-500">
        Travel Date: {formatTravelDay(day)}
        {day === manilaToday() && " (today)"}
      </p>

      {trips.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <p className="font-display text-lg font-bold text-navy-950">No trips on this route yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            SmartTransit doesn&apos;t have trips {origin ? `from ${origin} ` : ""}
            {destination ? `to ${destination} ` : ""}listed right now. Try another destination or check back later.
          </p>
          {onShowAll && (
            <Button variant="outline" size="sm" className="mt-4" onClick={onShowAll}>
              Show all trips
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="mt-5">
            <TripFilters
              trips={trips}
              filters={filters}
              onChange={(changes) => setFilters((prev) => ({ ...prev, ...changes }))}
              onClear={clearAll}
            />
          </div>

          {shown.length > 0 ? (
            <div className="mt-5 space-y-4">
              {shown.map((trip) => (
                <TripCard key={trip.id} trip={trip} travelDate={day} onBookSeat={onBookSeat} />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <p className="font-display text-lg font-bold text-navy-950">No trips match these filters</p>
              <p className="mt-1 text-sm text-slate-500">Try a different departure time or bus type, or clear the filters to see every trip.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={clearAll}>
                Clear All Filters
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
