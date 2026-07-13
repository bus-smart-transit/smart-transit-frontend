import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircleIcon } from "../../components/Icons.jsx";
import QrPlaceholder from "../../components/QrPlaceholder.jsx";
import { useBooking } from "../../context/BookingContext.jsx";
import "./ConfirmationPage.css";

export default function ConfirmationPage() {
  const navigate = useNavigate();
  const { booking, resetBooking } = useBooking();
  const { selectedTrip, selectedSeat } = booking;

  useEffect(() => {
    if (!selectedTrip || !selectedSeat) navigate("/booking", { replace: true });
  }, [selectedTrip, selectedSeat, navigate]);

  if (!selectedTrip || !selectedSeat) return null;

  const handleBackHome = () => {
    resetBooking();
    navigate("/dashboard");
  };

  return (
    <div className="confirmation-page">
      <div className="confirmation-card">
        <CheckCircleIcon size={40} className="confirmation-card__check" />
        <h1>Booking Confirmed!</h1>
        <p className="confirmation-card__subtitle">Payment successful</p>

        <div className="ticket">
          <div className="ticket__route">
            <span>{selectedTrip.origin}</span>
            <span className="ticket__route-arrow">→</span>
            <span>{selectedTrip.destination}</span>
          </div>

          <div className="ticket__divider" />

          <div className="ticket__qr">
            <QrPlaceholder size={140} />
          </div>

          <div className="ticket__info">
            <div>
              <span>Bus</span>
              <strong>{selectedTrip.bus}</strong>
            </div>
            <div>
              <span>Date</span>
              <strong>{selectedTrip.departure}</strong>
            </div>
            <div>
              <span>Passenger</span>
              <strong>Seat {selectedSeat}</strong>
            </div>
            <div>
              <span>Fare Paid</span>
              <strong>₱{selectedTrip.fare.toFixed(2)}</strong>
            </div>
          </div>

          <div className="ticket__valid-banner">
            <CheckCircleIcon size={18} />
            Valid Ticket — Present QR code to board
          </div>
        </div>

        <button className="confirmation-card__cta" onClick={handleBackHome}>
          Back To Home
        </button>
      </div>
    </div>
  );
}
