import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Hero from "./sections/Hero.jsx";
import HowItWorks from "./sections/HowItWorks.jsx";
import ProvincesWeServe from "./sections/ProvincesWeServe.jsx";
import TicketsShowcase from "./sections/TicketsShowcase.jsx";
import PassengerNotes from "./sections/PassengerNotes.jsx";
import FaqSection from "./sections/FaqSection.jsx";
import TripList from "../../components/TripList.jsx";
import NearbyTerminals from "../../components/NearbyTerminals.jsx";
import { useBooking } from "../../context/BookingContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { SAMPLE_TRIPS } from "../../data/sampleData.js";

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { updateSearch, selectTrip } = useBooking();
  const [searchResults, setSearchResults] = useState(null);
  const [prefill, setPrefill] = useState(null);

  // "Tagum Terminal, Tagum City" -> "Tagum Terminal" (the name trips use)
  const terminalName = (value) => value?.split(",")[0].trim() || undefined;

  const handleSearch = (values) => {
    updateSearch(values);
    setSearchResults({
      origin: terminalName(values.origin),
      destination: terminalName(values.destination),
      travelDate: values.date || undefined,
    });
  };

  // Only trips on the searched route; with no search, every trip.
  const routeTrips = SAMPLE_TRIPS.filter(
    (trip) =>
      (!searchResults?.origin || trip.origin === searchResults.origin) &&
      (!searchResults?.destination || trip.destination === searchResults.destination)
  );

  // Booking a trip needs an account -- guests are sent to sign in first.
  const handleBookSeat = (trip, dropOffStop) => {
    selectTrip(trip, dropOffStop);
    navigate(isAuthenticated ? "/booking/details" : "/login");
  };

  return (
    <PublicLayout>
      {/* id anchor lets the province cards below scroll
          back up to the existing Search Trips widget inside Hero. */}
      <div id="trip-search">
        <Hero onSearch={handleSearch} prefill={prefill} />
      </div>

      {/* Nearby terminals are a suggestion only: All Available Trips always
          lists every trip, whether or not the passenger shared a location. */}
      <section className="bg-white pb-14 pt-4">
        <div className="container-page space-y-10">
          <NearbyTerminals trips={SAMPLE_TRIPS} onBookSeat={handleBookSeat} />
          <div id="all-trips">
            <TripList
              trips={routeTrips}
              origin={searchResults?.origin}
              destination={searchResults?.destination}
              travelDate={searchResults?.travelDate}
              onBookSeat={handleBookSeat}
              onShowAll={() => {
                setPrefill({ key: Date.now() });
                setSearchResults((prev) => ({ travelDate: prev?.travelDate }));
              }}
            />
          </div>
        </div>
      </section>

      <ProvincesWeServe />
      <HowItWorks />
      <TicketsShowcase />
      <PassengerNotes />
      <FaqSection />
    </PublicLayout>
  );
}
