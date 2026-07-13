import { useNavigate } from "react-router-dom";
import AppTopBar from "../../components/AppTopBar.jsx";
import TripList from "../../components/TripList.jsx";
import { useBooking } from "../../context/BookingContext.jsx";
import { SAMPLE_TRIPS } from "../../data/sampleData.js";
import "./TripResultsPage.css";

export default function TripResultsPage() {
  const navigate = useNavigate();
  const { booking, selectTrip } = useBooking();

  const origin = booking.origin || "Ecoland Terminal";
  const destination = booking.destination || "Tagum Terminal";
  const date = booking.date || "Wed, June 10, 2026";

  const handleBookSeat = (trip) => {
    selectTrip(trip);
    navigate("/booking/seats");
  };

  return (
    <div className="trip-results">
      <AppTopBar backTo="/dashboard" backLabel="Back to Dashboard" />

      <div className="container trip-results__body">
        <TripList
          trips={SAMPLE_TRIPS}
          origin={origin}
          destination={destination}
          date={date}
          onBookSeat={handleBookSeat}
          onTrackLive={() => navigate("/track-bus")}
        />
      </div>
    </div>
  );
}
