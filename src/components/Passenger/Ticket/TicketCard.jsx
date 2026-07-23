import './TicketCard.css';

export default function TicketCard({
  fromLabel,
  toLabel,
  departureLabel,
  seatLabel,
  routeLabel,
  qrUrl,
  statusLabel,
  amountLabel,
  validLabel,
  expiresLabel,
}) {
  return (
    <article className="st-ticket-card">
      <header className="st-ticket-head">
        <h3>{fromLabel || 'Origin Terminal'}</h3>
        <h4>{toLabel || 'Destination Terminal'}</h4>

        <div className="st-ticket-strip">
          <div>
            <span>Departure</span>
            <strong>{departureLabel || '-'}</strong>
          </div>
          <div>
            <span>Seat</span>
            <strong>{seatLabel || '-'}</strong>
          </div>
          <div>
            <span>Route</span>
            <strong>{routeLabel || '-'}</strong>
          </div>
        </div>
      </header>

      <div className="st-ticket-body">
        <div className="st-ticket-qr-wrap">
          {qrUrl ? (
            <img src={qrUrl} alt="Ticket QR" className="st-ticket-qr" />
          ) : (
            <div className="st-ticket-qr-empty">QR unavailable</div>
          )}
        </div>

        <dl className="st-ticket-meta">
          <div><dt>Valid</dt><dd>{validLabel || '-'}</dd></div>
          <div><dt>Expires</dt><dd>{expiresLabel || '-'}</dd></div>
          <div><dt>Status</dt><dd>{statusLabel || '-'}</dd></div>
          <div><dt>Fare Paid</dt><dd>{amountLabel || '-'}</dd></div>
        </dl>
      </div>

      <footer className="st-ticket-foot">Valid Ticket — Present QR code to board</footer>
    </article>
  );
}
