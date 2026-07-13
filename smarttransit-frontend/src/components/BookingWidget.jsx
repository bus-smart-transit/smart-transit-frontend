import { useState } from "react";
import { LocationIcon, SwapIcon, CalendarIcon, SearchIcon } from "./Icons.jsx";
import { TERMINALS } from "../data/sampleData.js";
import "./BookingWidget.css";

export default function BookingWidget({ onSearch }) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");

  const swapLocations = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Booking flow / real search isn't built yet — this just
    // shows how the data would be passed along once it is.
    if (onSearch) onSearch({ origin, destination, date });
  };

  return (
    <form className="booking-widget" onSubmit={handleSubmit}>
      <div className="booking-widget__heading">
        <h2>Book a Seat</h2>
        <p>Sign in required to complete booking</p>
      </div>

      <div className="booking-widget__fields">
        <label className="booking-widget__field">
          <span className="booking-widget__label">FROM</span>
          <LocationIcon className="booking-widget__icon" />
          <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
            <option value="">Choose origin</option>
            {TERMINALS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="booking-widget__swap"
          onClick={swapLocations}
          aria-label="Swap origin and destination"
        >
          <SwapIcon />
        </button>

        <label className="booking-widget__field">
          <span className="booking-widget__label">TO</span>
          <LocationIcon className="booking-widget__icon" />
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="">Choose destination</option>
            {TERMINALS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="booking-widget__field">
          <CalendarIcon className="booking-widget__icon" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Travel date"
          />
        </label>

        <button type="submit" className="booking-widget__search">
          <SearchIcon size={18} />
          Search
        </button>
      </div>
    </form>
  );
}
