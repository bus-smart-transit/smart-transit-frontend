import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Hero from "./Hero.jsx";
import WhyChoose from "./WhyChoose.jsx";
import About from "./About.jsx";
import News from "./News.jsx";
import Faq from "./Faq.jsx";
import Contact from "./Contact.jsx";
import Footer from "../../components/Footer.jsx";
import TripList from "../../components/TripList.jsx";
import { useBooking } from "../../context/BookingContext.jsx";
import { SAMPLE_TRIPS } from "../../data/sampleData.js";
import "./LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();
  const { updateSearch, selectTrip } = useBooking();
  // null until the passenger searches -- once they do, the results
  // section appears right under the search widget, same as the
  // Figma "landing page (with results)" frame.
  const [searchResults, setSearchResults] = useState(null);

  const handleSearch = (values) => {
    updateSearch(values);
    setSearchResults({
      origin: values.origin || "Ecoland Terminal",
      destination: values.destination || "Tagum Terminal",
      date: values.date || "Wed, June 10, 2026",
    });
  };

  // Guests can see trip results, but booking a seat needs an account --
  // matches the "Sign in required to complete booking" note in the design.
  const handleBookSeat = (trip) => {
    selectTrip(trip);
    navigate("/login");
  };

  return (
    <div className="landing-page">
      <Hero onSearch={handleSearch} />

      {searchResults && (
        <section className="landing-results container">
          <TripList
            trips={SAMPLE_TRIPS}
            origin={searchResults.origin}
            destination={searchResults.destination}
            date={searchResults.date}
            onBookSeat={handleBookSeat}
            onTrackLive={() => navigate("/track-bus")}
          />
        </section>
      )}

      <WhyChoose />
      <About />
      <News />
      <Faq />
      <Contact />
      <Footer />
    </div>
  );
}
