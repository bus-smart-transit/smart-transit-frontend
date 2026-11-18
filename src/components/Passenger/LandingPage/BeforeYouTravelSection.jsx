import { CheckCircle2, Ticket, Clock, Calendar, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const NOTES = [
  { icon: CheckCircle2, title: 'Check your booking', description: 'Make sure your destination, date, schedule, and seat are correct before confirming.' },
  { icon: Ticket, title: 'Keep your ticket ready', description: 'Your digital ticket contains the QR code needed for boarding.' },
  { icon: Clock, title: 'Arrive early', description: 'Give yourself enough time to reach the terminal before departure.' },
  { icon: Calendar, title: 'Check the schedule', description: 'Review the latest departure information before leaving.' },
  { icon: HelpCircle, title: 'Need help?', description: <>Check the <a href="#faq" className="font-medium underline">FAQ</a> or <Link to="/contact" className="font-medium underline">contact SmartTransit</Link> if you have questions about your booking.</> },
];

export default function BeforeYouTravelSection() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">Passenger Notes</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">Before you travel</h2>
          <p className="mt-3 text-base leading-relaxed text-slate-500">
            A few reminders to keep your trip smooth, from booking to boarding.
          </p>
        </div>

        {/* 2026-11-18 (user): small cards in rows of three (two on tablets), the last row centred, instead of one
            full-width list that left the right half empty. Same text. */}
        <ul className="mt-12 flex flex-wrap justify-center gap-4 sm:mt-14 lg:gap-5">
          {/* 2026-11-18 (user): every note is a filled navy → ocean card with white text and a light icon tile; the
              cards lift a little on hover. */}
          {NOTES.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="w-full rounded-2xl bg-gradient-to-br from-navy-800 to-ocean p-5 text-white shadow-xl shadow-navy-900/15 transition duration-300 hover:-translate-y-1 hover:shadow-navy-900/25 sm:w-[calc(50%-0.5rem)] sm:p-6 lg:w-[calc((100%-2.5rem)/3)] [&_a]:text-mint hover:[&_a]:text-white"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <p className="mt-4 font-display text-base font-semibold text-white">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/80">{description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
