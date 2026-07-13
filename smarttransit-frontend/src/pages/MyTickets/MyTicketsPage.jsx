import { useState } from "react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import QrPlaceholder from "../../components/QrPlaceholder.jsx";
import { ChevronDownIcon } from "../../components/Icons.jsx";
import { SAMPLE_TICKETS } from "../../data/sampleData.js";
import "./MyTicketsPage.css";

const STATUS_CLASS = {
  Confirmed: "ticket-status--confirmed",
  Completed: "ticket-status--completed",
  Cancelled: "ticket-status--cancelled",
};

export default function MyTicketsPage() {
  const [openTicket, setOpenTicket] = useState(SAMPLE_TICKETS[0]?.bookingId ?? null);

  const toggleTicket = (bookingId) => {
    setOpenTicket((current) => (current === bookingId ? null : bookingId));
  };

  return (
    <DashboardLayout>
      <div className="my-tickets-page">
        <div className="my-tickets-page__header">
          <h1>My Tickets</h1>
          <p>{SAMPLE_TICKETS.length} bookings on file</p>
        </div>

        <div className="ticket-list">
          {SAMPLE_TICKETS.map((ticket) => {
            const isOpen = openTicket === ticket.bookingId;
            return (
              <div className="ticket-row" key={ticket.bookingId}>
                <button
                  className="ticket-row__summary"
                  onClick={() => toggleTicket(ticket.bookingId)}
                  aria-expanded={isOpen}
                >
                  <div className="ticket-row__route">
                    <p className="ticket-row__booking-id">{ticket.bookingId}</p>
                    <p>
                      {ticket.origin} → {ticket.destination}
                    </p>
                  </div>
                  <div className="ticket-row__meta">
                    <span>{ticket.departure}</span>
                    <span>Seat {ticket.seat}</span>
                  </div>
                  <span className={`ticket-status ${STATUS_CLASS[ticket.status]}`}>
                    {ticket.status}
                  </span>
                  <ChevronDownIcon
                    size={18}
                    className={`ticket-row__chevron ${isOpen ? "ticket-row__chevron--open" : ""}`}
                  />
                </button>

                {isOpen && (
                  <div className="ticket-row__details">
                    <div className="ticket-row__info">
                      <div>
                        <span>Bus Operator</span>
                        <strong>{ticket.operator}</strong>
                      </div>
                      <div>
                        <span>Origin</span>
                        <strong>{ticket.origin}</strong>
                      </div>
                      <div>
                        <span>Destination</span>
                        <strong>{ticket.destination}</strong>
                      </div>
                      <div>
                        <span>Departure</span>
                        <strong>{ticket.departure}</strong>
                      </div>
                      <div>
                        <span>Seat Number</span>
                        <strong>{ticket.seat}</strong>
                      </div>
                      <div>
                        <span>Fare Paid</span>
                        <strong>₱{ticket.fare.toFixed(2)}</strong>
                      </div>
                    </div>

                    {ticket.status !== "Cancelled" ? (
                      <div className="ticket-row__qr">
                        <QrPlaceholder size={110} />
                        <span>Present this QR code to board</span>
                      </div>
                    ) : (
                      <div className="ticket-row__qr ticket-row__qr--cancelled">
                        <span>This booking was cancelled — no ticket to present.</span>
                      </div>
                    )}
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
