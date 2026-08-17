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

// Rendered as a single dashed-divider panel -- meant to read like a
// short page of travel notes, not another set of shadowed cards.
export default function PassengerNotes() {
  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">
            Passenger Notes
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">
            Before you travel
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-500">
            A few reminders to keep your trip smooth, from booking to boarding.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {NOTES.map(({ icon: Icon, title, description }, index) => (
            <div
              key={title}
              className={`flex gap-4 px-6 py-5 sm:px-8 ${
                index !== NOTES.length - 1 ? "border-b border-dashed border-slate-200" : ""
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                <Icon size={18} />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold text-navy-950">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
              </div>
            </div>
          ))}

          <div className="flex gap-4 border-t border-dashed border-slate-200 px-6 py-5 sm:px-8">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
              <InfoIcon size={18} />
            </span>
            <div>
              <h3 className="font-display text-base font-semibold text-navy-950">Need help?</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Check the{" "}
                <Link to="/faq" className="font-medium text-navy-800 underline underline-offset-2">
                  FAQ
                </Link>{" "}
                or{" "}
                <Link to="/contact" className="font-medium text-navy-800 underline underline-offset-2">
                  contact SmartTransit
                </Link>{" "}
                if you have questions about your booking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
