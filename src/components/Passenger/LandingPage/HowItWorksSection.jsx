import { MapPin, Search, CalendarCheck, CreditCard, QrCode } from 'lucide-react';

const STEPS = [
  { step: '01', icon: MapPin, title: 'Choose Your Destination', description: 'Pick where you board and where you get off.' },
  { step: '02', icon: Search, title: 'Search for a Trip', description: 'Choose your travel date and search for the buses on that day.' },
  { step: '03', icon: CalendarCheck, title: 'Choose Your Schedule', description: 'Review the available trips and select the schedule that works best for you.' },
  { step: '04', icon: CreditCard, title: 'Complete Your Payment', description: 'Follow the available payment process to confirm your reservation.' },
  { step: '05', icon: QrCode, title: 'Get Your Digital Ticket', description: 'After your booking is confirmed, your digital ticket and QR code will be available in your account.' },
];

/**
 * 2026-11-18 (user): redesigned as a timeline, same text. Each step is an icon in a white circle, joined by a dashed
 * line on wide screens; the last step, the ticket, is the filled ocean one. On phones the steps stack with the line
 * down the left. No background of its own: the whole page is mist (user, 2026-11-18)
 * (a full ocean block was tried first and clashed with the navy hero).
 */
export default function HowItWorksSection() {
  const last = STEPS.length - 1;
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">How SmartTransit works</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">Your trip, made simple.</h2>
          <p className="mt-3 text-base leading-relaxed text-slate-500">
            New to SmartTransit? Follow these simple steps to find a trip, complete your booking, and board with your digital ticket.
          </p>
        </div>

        <ol className="mt-12 grid gap-10 sm:mt-14 lg:grid-cols-5 lg:gap-6">
          {STEPS.map(({ step, icon: Icon, title, description }, index) => {
            const isLast = index === last;
            return (
              <li key={step} className="relative flex items-start gap-5 text-left lg:flex-col lg:items-center lg:gap-0 lg:text-center">
                {/* The dashed line to the next step: sideways on wide screens, down the left side on phones. */}
                {!isLast && (
                  <>
                    <span aria-hidden="true" className="absolute left-[calc(50%+2.25rem)] right-[calc(-50%+2.25rem)] top-7 hidden border-t-2 border-dashed border-ocean/25 lg:block" />
                    <span aria-hidden="true" className="absolute -bottom-8 left-7 top-16 border-l-2 border-dashed border-ocean/25 lg:hidden" />
                  </>
                )}
                <span className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${isLast ? 'bg-ocean text-white shadow-lg shadow-ocean/30' : 'bg-white text-ocean shadow-card ring-1 ring-fog'}`}>
                  <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="min-w-0 pt-1 lg:mt-5 lg:pt-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Step {Number(step)}</p>
                  <h3 className="mt-1.5 font-display text-lg font-semibold text-navy-950">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 lg:mx-auto lg:max-w-xs">{description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
