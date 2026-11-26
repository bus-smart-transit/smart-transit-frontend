import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BusFront, Navigation } from 'lucide-react';
import QrImage from './QrImage';
import { splitDeparture } from '../../../utils/ticketPrint';
import { baggageText } from '../../../utils/ticketExtras';

// Batch 80 (user, 2026-11-19): the designer's ticket (home page sample) for the real ticket. Each status gives the pill
// in the navy header and the line at the foot of the ticket.
const STATUS = {
  valid:     { pill: 'Valid', pillClass: 'bg-mint text-navy-900', text: 'Valid ticket. Show this QR code when boarding', mod: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  issued:    { pill: 'Issued', pillClass: 'bg-mint text-navy-900', text: 'Ticket Issued — Ready for boarding', mod: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  boarded:   { pill: 'Boarded', pillClass: 'bg-sky-200 text-navy-900', text: 'Boarded — You are currently on this trip', mod: 'border-sky-300 bg-sky-50 text-sky-700' },
  alighted:  { pill: 'Completed', pillClass: 'bg-white/90 text-slate-700', text: 'Trip Completed — Thank you for riding!', mod: 'border-slate-300 bg-slate-100 text-slate-600' },
  expired:   { pill: 'Expired', pillClass: 'bg-red-100 text-red-800', text: 'This ticket has expired', mod: 'border-red-300 bg-red-50 text-red-800' },
  // Batch 76: the bus left the boarding stop before the ticket was scanned; a new ticket is needed.
  missed:    { pill: 'Missed', pillClass: 'bg-red-100 text-red-800', text: 'Missed. The bus left your stop before this ticket was scanned. Buy a new ticket to ride.', mod: 'border-red-300 bg-red-50 text-red-800' },
  cancelled: { pill: 'Cancelled', pillClass: 'bg-red-100 text-red-800', text: 'Ticket Cancelled', mod: 'border-red-300 bg-red-50 text-red-900' },
};

function Field({ label, value, align = 'left', mono = false }) {
  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`mt-1 break-words text-sm font-semibold text-navy-950 ${mono ? 'font-data tracking-widest' : ''}`}>{value}</dd>
    </div>
  );
}

function Row({ label, children, valueClass = 'text-navy-950', testId }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5 last:border-b-0" data-testid={testId}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`text-right text-sm font-bold ${valueClass}`}>{children}</dd>
    </div>
  );
}

export default function TicketCard({
  fromLabel,
  toLabel,
  departureLabel,
  // Batch 80: seat (removed in Batch 76) and the route line (From and To say it) are no longer shown; callers may still pass them.
  qrContent,
  statusLabel,
  // Batch 74: the trip's departure (shown as "Departs"). The old end-of-day "Expires" row is gone: a ticket ends when
  // the bus passes its destination or the trip ends, which the Status row shows.
  validLabel,
  discountLabel = '',
  discountAmount = null,
  originalFare = null,
  farePaid = null,
  discountVerified = false,
  // Batch 75: what happened to a discount claimed online (the server's sentence), or '' when none was claimed.
  discountClaimMessage = '',
  // Batch 76: a priority seat ("Senior citizen") and baggage in the compartment. 2026-11-25 (user): baggage is paid in
  // cash on board; `baggagePaid` is what was paid so far.
  priorityLabel = '',
  hasBaggage = false,
  baggagePaid = 0,
  baggageCount = 0,
  trackingToken = '',
  trackingCode = '',
  ticketId = '',
  travellerName = '',
  onRenewLink = null,
  // The fare as text when no number is given (the purchase preview), and the colour of what is behind the ticket, so
  // the torn-off notches read as cut-outs.
  amountLabel = '',
  notchClassName = 'bg-white',
}) {
  const status = STATUS[String(statusLabel).toLowerCase()] ?? STATUS.issued;
  const footer = status;
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  // Replacing the link is a two-step action: it cuts off anyone who has the old one, including the passenger's own copies.
  const [renewStep, setRenewStep] = useState('idle'); // idle | confirm | working | error
  const [renewError, setRenewError] = useState('');
  // The link that follows this ticket's bus; only while the ticket is still usable.
  const canTrack = Boolean(trackingToken) && ['valid', 'issued', 'boarded'].includes(String(statusLabel).toLowerCase());

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/track/${trackingToken}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  // Batch 49 item 5: the short code is the main way to follow the bus; typed at "Track my bus".
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(trackingCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      setCodeCopied(false);
    }
  };

  const renew = async () => {
    setRenewStep('working');
    setRenewError('');
    try {
      await onRenewLink();
      setRenewStep('idle');
    } catch (err) {
      setRenewError(err?.message || 'The tracking link could not be replaced. Try again.');
      setRenewStep('error');
    }
  };

  const { date, time } = splitDeparture(validLabel || departureLabel);
  const hasDiscount = Boolean(discountLabel) && Number(discountAmount) > 0;
  // With a discount, the fare is told in the discount rows; otherwise it sits in the strip.
  const fareText = hasDiscount ? null : (farePaid != null ? `PHP ${Number(farePaid).toFixed(2)}` : (amountLabel || null));
  const strip = [
    date && ['Date', date],
    ['Departure', time || 'Not provided'],
    fareText && ['Fare', fareText],
  ].filter(Boolean);

  return (
    <article className="relative overflow-hidden rounded-2xl bg-white shadow-xl shadow-navy-900/10 ring-1 ring-slate-200">
      <header className="flex items-start justify-between gap-3 bg-gradient-to-r from-navy-800 to-ocean px-5 py-4 text-white">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold">SmartTransit</p>
          {/* Batch 51 item 7: booked for someone else. */}
          {travellerName && <p className="mt-0.5 break-words text-xs text-white/80" data-testid="ticket-traveller">Passenger: {travellerName}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${status.pillClass}`} data-testid="ticket-status">{status.pill}</span>
      </header>

      <dl className="px-5 pb-4 pt-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Field label="From" value={fromLabel || 'Origin Terminal'} />
          <div className="flex items-center gap-1.5 text-ocean" aria-hidden="true">
            <span className="w-4 border-t-2 border-dashed border-fog" />
            <BusFront className="h-5 w-5" strokeWidth={1.75} />
            <span className="w-4 border-t-2 border-dashed border-fog" />
          </div>
          <Field label="To" value={toLabel || 'Destination Terminal'} align="right" />
        </div>

        <div className={`mt-5 grid gap-3 rounded-xl bg-slate-50 px-4 py-3 ${strip.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {strip.map(([label, value], index) => (
            <Field key={label} label={label} value={value} align={index === strip.length - 1 && strip.length > 1 ? 'right' : 'left'} />
          ))}
        </div>

        {hasDiscount && (
          <div className="mt-3">
            <Row label="Original fare">PHP {Number(originalFare).toFixed(2)}</Row>
            <Row label={`${discountLabel} discount`} valueClass="text-teal-700">- PHP {Number(discountAmount).toFixed(2)}</Row>
            {discountVerified && <Row label="ID check" valueClass="text-emerald-700">Verified by Chauffeur</Row>}
            {farePaid != null && <Row label="Fare paid">PHP {Number(farePaid).toFixed(2)}</Row>}
          </div>
        )}

        {(priorityLabel || hasBaggage || Number(baggagePaid) > 0) && (
          <p data-testid="ticket-extras" className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            {[priorityLabel && `Priority seat: ${priorityLabel}`, baggageText({ has_baggage: hasBaggage, baggage_paid: baggagePaid, baggage_count: baggageCount }) && `Baggage: ${baggageText({ has_baggage: hasBaggage, baggage_paid: baggagePaid, baggage_count: baggageCount })}`].filter(Boolean).join(' · ')}
          </p>
        )}
        {discountClaimMessage && (
          <p data-testid="discount-claim-message" className="mt-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-900">{discountClaimMessage}</p>
        )}
      </dl>

      {/* The torn-off line; the notches take the colour behind the ticket, so they read as cut-outs. */}
      <div aria-hidden="true" className="relative h-6">
        <span className={`absolute -left-3 top-0 h-6 w-6 rounded-full ring-1 ring-slate-200 ${notchClassName}`} />
        <span className={`absolute -right-3 top-0 h-6 w-6 rounded-full ring-1 ring-slate-200 ${notchClassName}`} />
        <div className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-fog" />
      </div>

      <div className="flex flex-col-reverse items-center gap-4 px-5 pb-4 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full min-w-0 sm:w-auto">
          {/* Batch 51 item 8: typed by the Chauffeur when the QR cannot be shown (separate from the tracking code). */}
          {ticketId && (
            <div data-testid="ticket-id">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ticket ID</p>
              <p className="mt-1 font-data text-base font-bold tracking-widest text-navy-950">{ticketId}</p>
            </div>
          )}
          <p className="mt-3 text-xs leading-relaxed text-slate-500">Show this QR code to the Chauffeur when boarding.</p>
        </div>
        {/* The real QR stays large on white with a quiet border, so the Chauffeur's scanner reads it at once. */}
        <div className="grid h-40 w-40 shrink-0 place-items-center rounded-xl bg-white p-1.5 ring-1 ring-fog">
          {qrContent ? (
            <QrImage content={qrContent} alt="Ticket QR" className="h-36 w-36 object-contain" />
          ) : (
            <div className="text-xs text-slate-500">QR unavailable</div>
          )}
        </div>
      </div>

      {canTrack && trackingCode && (
        <div className="mx-5 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5" data-testid="tracking-code">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Tracking code</span>
            <strong className="font-data text-lg tracking-[0.2em] text-navy-950">{trackingCode}</strong>
            <span className="block text-xs text-slate-500">Type it at <Link to="/track" className="font-semibold text-navy-800 underline">Track my bus</Link>.</span>
          </div>
          <button
            type="button"
            onClick={copyCode}
            className="min-h-11 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {codeCopied ? 'Code copied' : 'Copy code'}
          </button>
        </div>
      )}

      {canTrack && (
        <div className="mx-5 mb-3 flex flex-wrap items-center gap-2">
          <Link
            to={`/track/${trackingToken}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-navy-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-900"
          >
            <Navigation size={15} aria-hidden="true" /> Track this bus
          </Link>
          <button
            type="button"
            onClick={copyLink}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {copied ? 'Link copied' : 'Copy tracking link'}
          </button>
          {typeof onRenewLink === 'function' && renewStep === 'idle' && (
            <button
              type="button"
              onClick={() => setRenewStep('confirm')}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              New tracking link
            </button>
          )}
        </div>
      )}

      {canTrack && typeof onRenewLink === 'function' && renewStep !== 'idle' && (
        <div role="group" aria-label="Replace tracking link" className="mx-5 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <p>The old link stops working at once, for everyone who has it. Your ticket QR code is not affected.</p>
          {renewStep === 'error' && <p role="alert" className="mt-1 text-red-700">{renewError}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={renewStep === 'working'}
              onClick={renew}
              className="rounded-full bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {renewStep === 'working' ? 'Replacing...' : 'Replace link'}
            </button>
            <button
              type="button"
              disabled={renewStep === 'working'}
              onClick={() => setRenewStep('idle')}
              className="rounded-full border border-amber-300 px-4 py-1.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
            >
              Keep the old link
            </button>
          </div>
        </div>
      )}

      <footer className={`mx-5 mb-3.5 rounded-xl border px-2.5 py-2.5 text-center text-sm font-bold ${footer.mod}`}>{footer.text}</footer>
    </article>
  );
}

