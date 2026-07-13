import { useState } from "react";
import { ChevronDownIcon } from "../../components/Icons.jsx";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import { TRIP_HISTORY } from "../../data/sampleData.js";
import "./TripHistoryPage.css";

export default function TripHistoryPage() {
  const [expandedId, setExpandedId] = useState(null);

  const toggleRow = (id) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  return (
    <DashboardLayout>
      <div className="trip-history-page">
        <div className="trip-history-page__header">
          <h1>Trip History</h1>
          <p>{TRIP_HISTORY.length} past trips</p>
        </div>

        <div className="trip-history-table">
          <div className="trip-history-table__head">
            <span>Date</span>
            <span>Route</span>
            <span>Bus Operator</span>
            <span>Seat</span>
            <span>Payment</span>
            <span>Trip Status</span>
            <span />
          </div>

          {TRIP_HISTORY.map((trip) => {
            const isOpen = expandedId === trip.id;
            return (
              <div className="trip-history-row" key={trip.id}>
                <div className="trip-history-row__main">
                  <span data-label="Date">{trip.date}</span>
                  <span data-label="Route">{trip.route}</span>
                  <span data-label="Bus Operator">{trip.operator}</span>
                  <span data-label="Seat">Seat {trip.seat}</span>
                  <span data-label="Payment" className="trip-history-row__payment">
                    {trip.paymentStatus}
                  </span>
                  <span
                    data-label="Trip Status"
                    className={`trip-history-row__status trip-history-row__status--${trip.tripStatus.toLowerCase()}`}
                  >
                    {trip.tripStatus}
                  </span>
                  <button
                    className="trip-history-row__toggle"
                    onClick={() => toggleRow(trip.id)}
                    aria-expanded={isOpen}
                  >
                    View Details
                    <ChevronDownIcon
                      size={16}
                      className={isOpen ? "trip-history-row__chevron--open" : ""}
                    />
                  </button>
                </div>

                {isOpen && (
                  <div className="trip-history-row__details">
                    <div>
                      <span>Fare Paid</span>
                      <strong>₱{trip.fare.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Payment Method</span>
                      <strong>{trip.paymentMethod}</strong>
                    </div>
                    <div>
                      <span>Bus Operator</span>
                      <strong>{trip.operator}</strong>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
