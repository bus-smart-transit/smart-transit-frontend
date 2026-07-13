import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppTopBar from "../../components/AppTopBar.jsx";
import { CardIcon } from "../../components/Icons.jsx";
import { useBooking } from "../../context/BookingContext.jsx";
import "./PaymentPage.css";

export default function PaymentPage() {
  const navigate = useNavigate();
  const { booking } = useBooking();
  const { selectedTrip, selectedSeat } = booking;

  useEffect(() => {
    if (!selectedTrip || !selectedSeat) navigate("/booking", { replace: true });
  }, [selectedTrip, selectedSeat, navigate]);

  if (!selectedTrip || !selectedSeat) return null;

  return (
    <div className="payment-page">
      <AppTopBar backTo="/booking/seats" backLabel="Back" />

      <div className="container payment-page__body">
        <div className="payment-card">
          <div className="payment-card__icon">
            <CardIcon size={26} />
          </div>
          <h1>Confirm Payment</h1>
          <p className="payment-card__subtitle">
            Review your booking and complete the transaction
          </p>

          <dl className="payment-card__summary">
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
              <dd>Seat {selectedSeat}</dd>
            </div>
            <div>
              <dt>Passengers</dt>
              <dd>1</dd>
            </div>
            <div>
              <dt>Fare per passenger</dt>
              <dd>₱{selectedTrip.fare.toFixed(2)}</dd>
            </div>
            <div className="payment-card__total-row">
              <dt>Total</dt>
              <dd>₱{selectedTrip.fare.toFixed(2)}</dd>
            </div>
          </dl>

          <p className="payment-card__method-label">PAYMENT METHOD</p>
          <div className="payment-method payment-method--selected">
            <span className="payment-method__badge">GCash</span>
          </div>

          <button
            className="payment-card__cta"
            onClick={() => navigate("/booking/gcash")}
          >
            Continue and go to payment
          </button>
        </div>
      </div>
    </div>
  );
}
