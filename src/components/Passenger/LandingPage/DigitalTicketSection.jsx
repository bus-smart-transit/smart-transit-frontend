import { BusFront } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../ui/Button';
import { useAuth } from '../../../api/hooks/useAuth';

const BEFORE_BOARDING_STEPS = [
  { step: 1, title: 'Open My Tickets', description: 'Find your active booking.' },
  { step: 2, title: 'Select your trip', description: 'Open the ticket you want to use.' },
  { step: 3, title: 'Check your details', description: 'Make sure your route and schedule are correct.' },
  { step: 4, title: 'Show your QR code', description: 'Present the QR code when boarding.' },
];

// A drawing that looks like a QR code (three corner squares and a fixed scatter of dots). It is a picture only and
// does not encode anything.
const QR_SIZE = 21;
const QR_MODULES = (() => {
  const cells = [];
  const inFinder = (x, y) => [[0, 0], [QR_SIZE - 7, 0], [0, QR_SIZE - 7]].some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7);
  let seed = 7;
  for (let y = 0; y < QR_SIZE; y += 1) {
    for (let x = 0; x < QR_SIZE; x += 1) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      if (!inFinder(x, y) && seed / 2147483648 > 0.52) cells.push([x, y]);
    }
  }
  return cells;
})();

function QrPicture({ className = '' }) {
  const finder = (x, y) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" rx="1.2" fill="currentColor" />
      <rect x={x + 1} y={y + 1} width="5" height="5" rx="0.8" fill="white" />
      <rect x={x + 2} y={y + 2} width="3" height="3" rx="0.5" fill="currentColor" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`} className={className} aria-hidden="true">
      {finder(0, 0)}
      {finder(QR_SIZE - 7, 0)}
      {finder(0, QR_SIZE - 7)}
      {QR_MODULES.map(([x, y]) => <rect key={`${x}.${y}`} x={x + 0.08} y={y + 0.08} width="0.84" height="0.84" rx="0.2" fill="currentColor" />)}
    </svg>
  );
}

const Field = ({ label, value, align = 'left' }) => (
  <div className={align === 'right' ? 'text-right' : ''}>
    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
    <dd className="mt-1 text-sm font-semibold text-navy-950">{value}</dd>
  </div>
);

/**
 * 2026-11-18 (user): same text, new design. The ticket is a white boarding pass on the mist page: a navy → ocean
 * strip across the top, the route as From → To with a bus between, the date, time and seat, then a torn-off line
 * (its notches are the page colour, so they read as cut-outs) above the booking ID and a QR picture. The steps beside it are joined by
 * a dashed line like the timeline above.
 */
export default function DigitalTicketSection() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const goToTickets = () => {
    const to = '/passenger/dashboard?tab=tickets';
    if (!isAuthenticated) {
      navigate('/passenger/login', { state: { redirectTo: to } });
      return;
    }
    navigate(to);
  };

  const lastStep = BEFORE_BOARDING_STEPS.length - 1;

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">Your Digital Ticket</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">
            Your digital ticket is always in your account.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-500">
            Once your booking is confirmed, you can access your digital ticket from My Tickets. Keep your QR code ready when boarding.
          </p>
        </div>

        <div className="mt-12 grid items-center gap-10 sm:mt-14 lg:grid-cols-2 lg:gap-14">
          <div className="px-1 sm:px-6">
            <article className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl shadow-navy-900/10">
              <header className="flex items-start justify-between gap-3 bg-gradient-to-r from-navy-800 to-ocean px-5 py-4 text-white">
                <div>
                  <p className="font-display text-base font-semibold">SmartTransit Express</p>
                  <p className="mt-0.5 text-xs text-white/75">Passenger: Juan Dela Cruz</p>
                </div>
                <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-navy-900">Confirmed</span>
              </header>

              <dl className="px-5 pb-5 pt-5">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <Field label="From" value="Your boarding stop" />
                  <div className="flex items-center gap-1.5 text-ocean" aria-hidden="true">
                    <span className="w-4 border-t-2 border-dashed border-fog" />
                    <BusFront className="h-5 w-5" strokeWidth={1.75} />
                    <span className="w-4 border-t-2 border-dashed border-fog" />
                  </div>
                  <Field label="To" value="Your drop-off stop" align="right" />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <Field label="Date" value="June 10, 2026" />
                  <Field label="Departure" value="7:00 AM" align="right" />
                </div>
              </dl>

              {/* The torn-off line; the notches are the page colour (slate-100), so they read as cut-outs. */}
              <div aria-hidden="true" className="relative h-6">
                <span className="absolute -left-3 top-0 h-6 w-6 rounded-full bg-slate-100" />
                <span className="absolute -right-3 top-0 h-6 w-6 rounded-full bg-slate-100" />
                <div className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-fog" />
              </div>

              <div className="flex items-center justify-between gap-4 px-5 pb-5 pt-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ticket ID</p>
                  <p className="mt-1 font-mono text-sm font-semibold tracking-widest text-navy-950">3F9A12BC</p>
                  <p className="mt-3 text-xs leading-relaxed text-slate-500">Present this QR code when boarding.</p>
                </div>
                <span className="shrink-0 rounded-xl p-1.5 ring-1 ring-fog">
                  <QrPicture className="h-20 w-20 text-navy-900" />
                </span>
              </div>
            </article>
          </div>

          <div className="mx-auto w-full max-w-sm lg:mx-0">
            <h3 className="font-display text-lg font-semibold text-navy-950">Before boarding</h3>
            <ol className="mt-6 space-y-6">
              {BEFORE_BOARDING_STEPS.map(({ step, title, description }, index) => (
                <li key={step} className="relative flex items-start gap-4">
                  {index < lastStep && (
                    <span aria-hidden="true" className="absolute -bottom-6 left-4 top-9 border-l-2 border-dashed border-fog" />
                  )}
                  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-ocean ring-2 ring-ocean">
                    {step}
                  </span>
                  <span className="pt-1">
                    <span className="block text-sm font-semibold text-navy-950">{title}</span>
                    <span className="mt-0.5 block text-sm text-slate-500">{description}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Button type="button" variant="primary" size="md" className="mt-8" onClick={goToTickets}>
              View My Tickets
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
