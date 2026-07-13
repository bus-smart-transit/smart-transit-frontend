import { UserIcon, ClockIcon, MapPinIcon } from "./Icons.jsx";
import "./TripList.css";

// Shows a list of available trips with a "X trips found" heading.
// Reused on the landing page (guest search results, shown inline)
// and on the /booking page (logged-in trip search results).
export default function TripList({
  trips,
  origin,
  destination,
  date,
  onBookSeat,
  onTrackLive,
}) {
  return (
    <div className="trip-list">
      <div className="trip-list__heading">
        <h2>All Available Trips</h2>
        <p>{trips.length} trips found</p>
      </div>
      <p className="trip-list__route-line">
        {origin.toUpperCase()} TO {destination.toUpperCase()}
      </p>
      <p className="trip-list__date-line">Travel Date: {date}</p>

      <div className="trip-list__items">
        {trips.map((trip) => (
          <div className="trip-card" key={trip.id}>
            <div className="trip-card__route">
              <div className="trip-card__stop">
                <span className="trip-card__dot" />
                <span>{trip.origin}</span>
              </div>
              <MapPinIcon size={16} className="trip-card__arrow" />
              <div className="trip-card__stop">
                <span className="trip-card__dot trip-card__dot--end" />
                <span>{trip.destination}</span>
              </div>
            </div>

            <div className="trip-card__details">
              <span>
                {trip.departure} → {trip.arrival}
              </span>
              <span>{trip.bus}</span>
              <span>{trip.duration}</span>
            </div>

            <div className="trip-card__footer">
              <div className="trip-card__seats">
                <UserIcon size={18} />
                <span>Seat Available: {trip.seatsAvailable}</span>
              </div>
              <div className="trip-card__eta">
                <ClockIcon size={16} />
                <span>Estimated Arrival: {trip.duration} from departure</span>
              </div>

              <div className="trip-card__actions">
                <div className="trip-card__fare">
                  <strong>₱{trip.fare}</strong>
                  <span>per passenger</span>
                </div>
                <button
                  className="trip-card__track"
                  onClick={() => onTrackLive(trip)}
                >
                  Track Live
                </button>
                <button
                  className="trip-card__book"
                  onClick={() => onBookSeat(trip)}
                >
                  Book Seat
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
