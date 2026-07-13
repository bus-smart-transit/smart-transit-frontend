import Navbar from "../../components/Navbar.jsx";
import BookingWidget from "../../components/BookingWidget.jsx";
import "./Hero.css";

// Hero no longer knows what happens after a search -- that's decided
// by whoever renders it (LandingPage shows results inline; a logged-in
// page could send the passenger somewhere else). It just forwards
// whatever the passenger typed via onSearch.
export default function Hero({ onSearch }) {
  return (
    <section id="home" className="hero">
      <Navbar />

      <div className="hero__banner">
        <div className="container hero__banner-inner">
          <span className="hero__badge">
            <span className="hero__badge-dot" />
            REAL-TIME GPS ACTIVE
          </span>
          <h1 className="hero__title">
            Ride smarter,
            <br />
            arrive on time.
          </h1>
          <p className="hero__subtitle">
            Book your seat, track your bus live, and pay online — the
            complete public transit experience for Davao Region XI, right
            in your browser.
          </p>
        </div>
      </div>

      <div className="container hero__widget-wrap">
        <div className="hero__teal-backdrop" />
        <BookingWidget onSearch={onSearch} />
      </div>
    </section>
  );
}
