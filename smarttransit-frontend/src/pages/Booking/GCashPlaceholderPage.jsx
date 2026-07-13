import { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "../../context/BookingContext.jsx";
import "./GCashPlaceholderPage.css";

// This page stands in for a real GCash checkout redirect. It is a
// frontend-only simulation — no real payment happens here. Once a
// real payment gateway is available, this whole component gets
// replaced by a redirect to the gateway's hosted checkout page.
export default function GCashPlaceholderPage() {
  const navigate = useNavigate();
  const { booking } = useBooking();
  const { selectedTrip, selectedSeat } = booking;
  const [status, setStatus] = useState("idle"); // idle -> processing -> done

  useEffect(() => {
    if (!selectedTrip || !selectedSeat) navigate("/booking", { replace: true });
  }, [selectedTrip, selectedSeat, navigate]);

  if (!selectedTrip || !selectedSeat) return null;

  const handlePay = () => {
    setStatus("processing");
    // Simulated processing delay so it feels like a real checkout.
    setTimeout(() => {
      setStatus("done");
      navigate("/booking/confirmation");
    }, 1400);
  };

  return (
    <div className="gcash-page">
      <div className="gcash-card">
        <div className="gcash-card__brand">GCash</div>
        <p className="gcash-card__note">
          Sample checkout screen — SmartTransit would redirect here to the
          real GCash app once a payment gateway is connected.
        </p>

        <div className="gcash-card__amount">
          <span>Amount to Pay</span>
          <strong>₱{selectedTrip.fare.toFixed(2)}</strong>
        </div>

        <label className="gcash-card__field">
          GCash Mobile Number
          <input type="tel" placeholder="09XX XXX XXXX" defaultValue="0917 123 4567" />
        </label>

        <label className="gcash-card__field">
          MPIN
          <input type="password" placeholder="••••" maxLength={4} defaultValue="1234" />
        </label>

        <button
          className="gcash-card__pay-btn"
          onClick={handlePay}
          disabled={status === "processing"}
        >
          {status === "processing" ? "Processing…" : `Pay ₱${selectedTrip.fare.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
