import { useNavigate } from "react-router-dom";
import AppTopBar from "../../components/AppTopBar.jsx";
import TripList from "../../components/TripList.jsx";
import { useBooking } from "../../context/BookingContext.jsx";
import { SAMPLE_TRIPS } from "../../data/sampleData.js";

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
    <div className="min-h-screen bg-slate-50">
      <AppTopBar backTo="/" backLabel="Back to Home" />
      <div className="container-page py-8">
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
