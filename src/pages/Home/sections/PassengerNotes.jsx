import { Link } from "react-router-dom";
import { CheckCircleIcon, TicketIcon, ClockIcon, CalendarIcon, InfoIcon } from "../../../components/Icons.jsx";

const NOTES = [
  {
    icon: CheckCircleIcon,
    title: "Check your booking",
    description: "Make sure your destination, date, schedule, and seat are correct before confirming.",
  },
  {
    icon: TicketIcon,
    title: "Keep your ticket ready",
    description: "Your digital ticket contains the QR code needed for boarding.",
  },
  {
    icon: ClockIcon,
    title: "Arrive early",
    description: "Give yourself enough time to reach the terminal before departure.",
  },
  {
    icon: CalendarIcon,
    title: "Check the schedule",
    description: "Review the latest departure information before leaving.",
  },
];

export default function PassengerNotes() {
  const items = [
    ...NOTES,
    {
      icon: InfoIcon,
      title: "Need help?",
      description: (
        <>
          Check the{" "}
          <a href="#faq" className="text-teal-600 underline">
            FAQ
          </a>{" "}
          or{" "}
          <Link to="/contact" className="text-teal-600 underline">
            contact SmartTransit
          </Link>{" "}
          if you have questions about your booking.
        </>
      ),
    },
  ];

  return (
    <section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
          Passenger Notes
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
          Before you travel
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          A few reminders to keep your trip smooth, from booking to boarding.
        </p>

        <ul className="mt-8 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-card">
          {items.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex items-start gap-4 px-5 py-4 sm:px-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                <Icon size={16} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-0.5 text-sm text-slate-500">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
