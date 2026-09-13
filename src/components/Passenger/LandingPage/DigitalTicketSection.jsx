import { QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../ui/Button';

const BEFORE_BOARDING_STEPS = [
  { step: 1, title: 'Open My Tickets', description: 'Find your active booking.' },
  { step: 2, title: 'Select your trip', description: 'Open the ticket you want to use.' },
  { step: 3, title: 'Check your details', description: 'Make sure your route, schedule, and seat are correct.' },
  { step: 4, title: 'Show your QR code', description: 'Present the QR code when boarding.' },
];

export default function DigitalTicketSection() {
  const navigate = useNavigate();

  return (
    <section className="bg-white px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Your Digital Ticket</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
          Your digital ticket is always in your account.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Once your booking is confirmed, you can access your digital ticket from My Tickets. Keep your QR code ready when boarding.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="mx-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-navy-950 p-5 text-white shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">SmartTransit Express</p>
                <p className="text-xs text-slate-300">Passenger: Juan Dela Cruz</p>
              </div>
              <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-semibold text-teal-300">Confirmed</span>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs">
              <div>
                <p className="text-slate-400">Origin</p>
                <p className="font-semibold">Ecoland Terminal</p>
              </div>
              <div>
                <p className="text-slate-400">Destination</p>
                <p className="font-semibold">Tagum Terminal</p>
              </div>
              <div>
                <p className="text-slate-400">Date</p>
                <p className="font-semibold">June 10, 2026</p>
              </div>
              <div>
                <p className="text-slate-400">Departure</p>
                <p className="font-semibold">7:00 AM</p>
              </div>
              <div>
                <p className="text-slate-400">Seat</p>
                <p className="font-semibold">13</p>
              </div>
              <div>
                <p className="text-slate-400">Booking ID</p>
                <p className="font-semibold">ST-20260610-0142</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-3 text-slate-900">
              <p className="text-[11px] text-slate-500">Present this QR code when boarding.</p>
              <QrCode className="h-14 w-14 shrink-0" aria-hidden="true" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Before boarding</h3>
            <ol className="mt-4 space-y-4">
              {BEFORE_BOARDING_STEPS.map(({ step, title, description }) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500 text-xs font-bold text-white">
                    {step}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{title}</span>
                    <span className="block text-xs text-slate-500">{description}</span>
                  </span>
                </li>
              ))}
            </ol>
            <Button type="button" variant="primary" size="md" className="mt-6" onClick={() => navigate('/passenger/dashboard?tab=tickets')}>
              View My Tickets
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
