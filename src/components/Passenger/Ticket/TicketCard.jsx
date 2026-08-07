import './TicketCard.css';

const STATUS_FOOTER = {
  valid:     { text: 'Valid Ticket — Present QR code to board', mod: '' },
  valid:     { text: 'Valid Ticket — Present QR code to board', mod: '' },
  boarded:   { text: 'Boarded — You are currently on this trip', mod: 'st-ticket-foot--boarded' },
  alighted:  { text: 'Trip Completed — Thank you for riding!', mod: 'st-ticket-foot--alighted' },
  expired:   { text: 'Ticket Expired — This ticket is no longer valid', mod: 'st-ticket-foot--expired' },
  cancelled: { text: 'Ticket Cancelled', mod: 'st-ticket-foot--cancelled' },
};

export default function TicketCard({
  fromLabel,
  toLabel,
  departureLabel,
  seatLabel,
  routeLabel,
  qrUrl,
  statusLabel,
  validLabel,
  expiresLabel,
}) {
  const footer = STATUS_FOOTER[String(statusLabel).toLowerCase()] ?? STATUS_FOOTER.issued;

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
        </dl>
      </div>

      <footer className={`st-ticket-foot ${footer.mod}`}>{footer.text}</footer>
    </article>
  );
}
