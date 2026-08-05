import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Hero from "./sections/Hero.jsx";
import WhyChoose from "./sections/WhyChoose.jsx";
import HowItWorks from "./sections/HowItWorks.jsx";
import TrackingShowcase from "./sections/TrackingShowcase.jsx";
import TicketsShowcase from "./sections/TicketsShowcase.jsx";
import TripManagementShowcase from "./sections/TripManagementShowcase.jsx";
import RewardsShowcase from "./sections/RewardsShowcase.jsx";
import NewsPreview from "./sections/NewsPreview.jsx";
import FaqPreview from "./sections/FaqPreview.jsx";
import CtaSection from "./sections/CtaSection.jsx";
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

  // Booking a seat needs an account -- guests are sent to sign in first.
  const handleBookSeat = (trip) => {
    selectTrip(trip);
    navigate(isAuthenticated ? "/booking/seats" : "/login");
  };

  return (
    <PublicLayout>
      <Hero onSearch={handleSearch} />

      {searchResults && (
        <section className="bg-white py-14">
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

      <WhyChoose />
      <HowItWorks />
      <TrackingShowcase />
      <TicketsShowcase />
      <TripManagementShowcase />
      <RewardsShowcase />
      <NewsPreview />
      <FaqPreview />
      <CtaSection />
    </PublicLayout>
  );
}
