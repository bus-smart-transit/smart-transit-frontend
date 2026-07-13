import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppTopBar from "../../components/AppTopBar.jsx";
import { ClockIcon, BusIcon, MapPinIcon } from "../../components/Icons.jsx";
import { useBooking } from "../../context/BookingContext.jsx";
import { BUS_SEAT_COLUMNS, BUS_SEAT_ROWS, TAKEN_SEATS } from "../../data/sampleData.js";
import "./SeatSelectionPage.css";

export default function SeatSelectionPage() {
  const navigate = useNavigate();
  const { booking, selectSeat } = useBooking();
  const { selectedTrip, selectedSeat } = booking;

  // If someone lands here directly without picking a trip first,
  // send them back to search instead of showing a broken page.
  useEffect(() => {
    if (!selectedTrip) navigate("/booking", { replace: true });
  }, [selectedTrip, navigate]);

  if (!selectedTrip) return null;

  const seatNumbers = Array.from(
    { length: BUS_SEAT_COLUMNS.length * BUS_SEAT_ROWS },
    (_, i) => String(i + 1)
  );

  const handlePickSeat = (seat) => {
    if (TAKEN_SEATS.includes(seat)) return;
    selectSeat(seat);
  };

  return (
    <div className="seat-page">
      <AppTopBar backTo="/booking" backLabel="Back to Search" />

      <div className="container seat-page__body">
        <div className="seat-page__main">
          <div className="route-card">
            <div className="route-card__top">
              <span className="route-card__label">Route</span>
              <span className="route-card__badge">
                {selectedTrip.seatsAvailable} seats available
              </span>
            </div>
            <p className="route-card__origin">{selectedTrip.origin}</p>
            <div className="route-card__grid">
              <div>
                <ClockIcon size={18} />
                <span>Departure</span>
                <strong>{selectedTrip.departure}</strong>
              </div>
              <div>
                <ClockIcon size={18} />
                <span>Arrival</span>
                <strong>{selectedTrip.arrival}</strong>
              </div>
              <div>
                <BusIcon size={18} />
                <span>Vehicle</span>
                <strong>{selectedTrip.bus}</strong>
              </div>
              <div>
                <MapPinIcon size={18} />
                <span>Duration</span>
                <strong>{selectedTrip.duration}</strong>
              </div>
            </div>
          </div>

          <div className="seat-card">
            <h2>Select Your Seat</h2>
            <div className="seat-legend">
              <span><i className="seat-legend__swatch seat-legend__swatch--available" /> Available</span>
              <span><i className="seat-legend__swatch seat-legend__swatch--taken" /> Taken</span>
              <span><i className="seat-legend__swatch seat-legend__swatch--selected" /> Your selection</span>
            </div>

            <div className="seat-grid">
              {seatNumbers.map((seat) => {
                const isTaken = TAKEN_SEATS.includes(seat);
                const isSelected = selectedSeat === seat;
                return (
                  <button
                    key={seat}
                    className={`seat ${isTaken ? "seat--taken" : ""} ${isSelected ? "seat--selected" : ""}`}
                    disabled={isTaken}
                    onClick={() => handlePickSeat(seat)}
                  >
                    {seat}
                  </button>
                );
              })}
            </div>

            {selectedSeat && (
              <p className="seat-card__selection">Seat {selectedSeat} selected</p>
            )}
          </div>
        </div>

        <aside className="booking-summary-card">
          <h2>Booking Summary</h2>
          <dl>
            <div>
              <dt>Route</dt>
              <dd>
                {selectedTrip.origin} → {selectedTrip.destination}
              </dd>
            </div>
            <div>
              <dt>Departure</dt>
              <dd>{selectedTrip.departure}</dd>
            </div>
            <div>
              <dt>Seat</dt>
              <dd>{selectedSeat ? `Seat ${selectedSeat}` : "Not selected yet"}</dd>
            </div>
            <div>
              <dt>Passengers</dt>
              <dd>1</dd>
            </div>
            <div>
              <dt>Fare per passenger</dt>
              <dd>₱{selectedTrip.fare.toFixed(2)}</dd>
            </div>
          </dl>
          <div className="booking-summary-card__total">
            <span>Total</span>
            <strong>₱{selectedTrip.fare.toFixed(2)}</strong>
          </div>
          <button
            className="booking-summary-card__cta"
            disabled={!selectedSeat}
            onClick={() => navigate("/booking/payment")}
          >
            Continue To Payment
          </button>
        </aside>
      </div>
    </div>
  );
}
