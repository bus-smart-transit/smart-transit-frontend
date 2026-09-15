import { parseAppDate } from '../../../utils/dates';

const STATUS_FOOTER = {
  valid:     { text: 'Valid Ticket — Present QR code to board', mod: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  issued:    { text: 'Ticket Issued — Ready for boarding', mod: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  boarded:   { text: 'Boarded — You are currently on this trip', mod: 'border-sky-300 bg-sky-50 text-sky-700' },
  alighted:  { text: 'Trip Completed — Thank you for riding!', mod: 'border-slate-300 bg-slate-100 text-slate-600' },
  expired:   { text: 'Ticket Expired — This ticket is no longer valid', mod: 'border-red-300 bg-red-50 text-red-800' },
  cancelled: { text: 'Ticket Cancelled', mod: 'border-red-300 bg-red-50 text-red-900' },
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
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <header className="bg-gradient-to-br from-teal-500 to-teal-600 px-4.5 pb-4 pt-4.5 text-white">
        <h3 className="text-base font-bold">{fromLabel || 'Origin Terminal'}</h3>
        <h4 className="mt-1 text-2xl font-extrabold leading-none sm:text-3xl">{toLabel || 'Destination Terminal'}</h4>

        <div className="mt-3.5 grid grid-cols-3 gap-2">
          <div>
            <span className="block text-[0.62rem] uppercase tracking-wide opacity-85">Departure</span>
            <strong className="mt-0.5 block text-sm font-bold">{departureLabel || '-'}</strong>
          </div>
          <div>
            <span className="block text-[0.62rem] uppercase tracking-wide opacity-85">Seat</span>
            <strong className="mt-0.5 block text-sm font-bold">{seatLabel || '-'}</strong>
          </div>
          <div>
            <span className="block text-[0.62rem] uppercase tracking-wide opacity-85">Route</span>
            <strong className="mt-0.5 block text-sm font-bold">{routeLabel || '-'}</strong>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3.5 border-t-2 border-dashed border-slate-200 p-3.5 sm:grid-cols-[140px_1fr]">
        <div className="grid h-35 w-full place-items-center rounded-xl border border-slate-200 bg-slate-50 sm:w-35">
          {qrUrl ? (
            <img src={qrUrl} alt="Ticket QR" className="h-31 w-31 object-contain" />
          ) : (
            <div className="text-xs text-slate-500">QR unavailable</div>
          )}
        </div>

        <dl className="grid gap-2">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5"><dt className="text-xs text-slate-500">Valid</dt><dd className="text-right text-sm font-bold text-navy-950">{validLabel || '-'}</dd></div>
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5"><dt className="text-xs text-slate-500">Expires</dt><dd className="text-right text-sm font-bold text-navy-950">{expiresLabel || '-'}</dd></div>
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5"><dt className="text-xs text-slate-500">Status</dt><dd className="text-right text-sm font-bold text-navy-950">{statusLabel || '-'}</dd></div>
        </dl>
      </div>

      <footer className={`mx-3.5 mb-3.5 rounded-xl border px-2.5 py-2.5 text-center text-sm font-bold ${footer.mod}`}>{footer.text}</footer>
    </article>
  );
}

