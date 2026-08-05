import { UserIcon, ClockIcon, MapPinIcon, BusIcon } from "./Icons.jsx";
import Button from "./ui/Button.jsx";
import Card from "./ui/Card.jsx";

export default function TripList({ trips, origin, destination, date, onBookSeat, onTrackLive }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-navy-950">All Available Trips</h2>
        <p className="text-sm font-medium text-slate-500">{trips.length} trips found</p>
      </div>
      <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-navy-700">
        {origin.toUpperCase()} TO {destination.toUpperCase()}
      </p>
      <p className="text-sm text-slate-500">Travel Date: {date}</p>

      <div className="mt-6 space-y-4">
        {trips.map((trip) => (
          <Card key={trip.id} className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
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
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onTrackLive(trip)}>
                    Track Live
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => onBookSeat(trip)}>
                    Book Seat
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
