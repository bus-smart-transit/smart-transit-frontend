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
import { useBooking } from "../../context/BookingContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { SAMPLE_TRIPS } from "../../data/sampleData.js";

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { updateSearch, selectTrip } = useBooking();
  const [searchResults, setSearchResults] = useState(null);

  const handleSearch = (values) => {
    updateSearch(values);
    setSearchResults({
      origin: values.origin || "Ecoland Terminal",
      destination: values.destination || "Tagum Terminal",
      date: values.date || "Wed, June 10, 2026",
    });
  };

  // Booking a trip needs an account -- guests are sent to sign in first.
  const handleBookSeat = (trip) => {
    selectTrip(trip);
    navigate(isAuthenticated ? "/booking/details" : "/login");
  };

  return (
    <PublicLayout>
      {/* id anchor lets the province cards below scroll
          back up to the existing Search Trips widget inside Hero. */}
      <div id="trip-search">
        <Hero onSearch={handleSearch} />
      </div>

      {searchResults && (
        <section className="bg-white pb-14 pt-4">
          <div className="container-page">
            <TripList
              trips={SAMPLE_TRIPS}
              origin={searchResults.origin}
              destination={searchResults.destination}
              date={searchResults.date}
              onBookSeat={handleBookSeat}
              onTrackLive={() => navigate("/track-bus")}
            />
          </div>
        </section>
      )}

      <ProvincesWeServe />
      <HowItWorks />
      <TicketsShowcase />
      <PassengerNotes />
      <FaqSection />
    </PublicLayout>
  );
}
