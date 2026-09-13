import { useNavigate } from 'react-router-dom';
import { Ticket, History, MapPin, Gift, CalendarClock, ChevronRight } from 'lucide-react';

const ITEMS = [
  { icon: Ticket, title: 'My Tickets', description: 'View your upcoming bookings, ticket information, and QR codes.', to: '/passenger/dashboard?tab=tickets' },
  { icon: History, title: 'Trip History', description: 'Review your previous trips and booking records.', to: '/passenger/dashboard?tab=transactions' },
  { icon: MapPin, title: 'Track Bus', description: 'Check the location of your assigned bus when live tracking is available.', to: '/passenger/dashboard?tab=map' },
  { icon: Gift, title: 'Rewards', description: 'View your available rewards and points.', to: '/passenger/dashboard?tab=rewards' },
  { icon: CalendarClock, title: 'Schedules', description: 'Check routes and departure times when planning your trip.', to: '/passenger/dashboard' },
];

export default function WhatYouCanDoSection() {
  const navigate = useNavigate();

  return (
    <section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Quick Guide</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
          What can you do with SmartTransit?
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Your passenger account gives you access to the tools you need before, during, and after your trip.
        </p>

        <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {ITEMS.map(({ icon: Icon, title, description, to }) => (
            <button
              key={title}
              type="button"
              onClick={() => navigate(to)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-slate-900">{title}</span>
                <span className="block text-xs text-slate-500">{description}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
