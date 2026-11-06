import { Search, CalendarCheck, Armchair, CreditCard, QrCode } from 'lucide-react';

const STEPS = [
  { step: '01', icon: Search, title: 'Search for a Trip', description: 'Choose your origin, destination, and travel date using the Search Trips section.' },
  { step: '02', icon: CalendarCheck, title: 'Choose Your Schedule', description: 'Review the available trips and select the schedule that works best for you.' },
  { step: '03', icon: Armchair, title: 'Reserve Your Seat', description: 'Choose an available seat and review your trip details.' },
  { step: '04', icon: CreditCard, title: 'Complete Your Payment', description: 'Follow the available payment process to confirm your reservation.' },
  { step: '05', icon: QrCode, title: 'Get Your Digital Ticket', description: 'After your booking is confirmed, your digital ticket and QR code will be available in your account.' },
];

export default function HowItWorksSection() {
  return (
    <section className="bg-white px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* 2026-11-06 (passenger redesign): the shorter heading of the new design; the steps are our real flow. */}
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">How SmartTransit works</p>
        <h2 className="mt-1 font-display text-3xl font-bold text-navy-950 sm:text-4xl">Your trip, made simple.</h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-500">
          New to SmartTransit? Follow these simple steps to find a trip, reserve your seat, complete your booking, and board with your digital ticket.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map(({ step, icon: Icon, title, description }) => (
            <div key={step} className="flex flex-col items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-teal-200 bg-teal-50 text-xs font-bold text-teal-700">
                {step}
              </div>
              <Icon className="h-5 w-5 text-slate-400" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
              <p className="text-xs leading-relaxed text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
