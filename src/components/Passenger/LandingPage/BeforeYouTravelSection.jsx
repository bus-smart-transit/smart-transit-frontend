import { CheckCircle2, Ticket, Clock, Calendar, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const NOTES = [
  { icon: CheckCircle2, title: 'Check your booking', description: 'Make sure your destination, date, schedule, and seat are correct before confirming.' },
  { icon: Ticket, title: 'Keep your ticket ready', description: 'Your digital ticket contains the QR code needed for boarding.' },
  { icon: Clock, title: 'Arrive early', description: 'Give yourself enough time to reach the terminal before departure.' },
  { icon: Calendar, title: 'Check the schedule', description: 'Review the latest departure information before leaving.' },
  { icon: HelpCircle, title: 'Need help?', description: <>Check the <a href="#faq" className="text-teal-600 underline">FAQ</a> or <Link to="/contact" className="text-teal-600 underline">contact SmartTransit</Link> if you have questions about your booking.</> },
];

export default function BeforeYouTravelSection() {
  return (
    <section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Passenger Notes</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">Before you travel</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          A few reminders to keep your trip smooth, from booking to boarding.
        </p>

        <div className="mt-8 space-y-3">
          {NOTES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="text-xs text-slate-500">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
