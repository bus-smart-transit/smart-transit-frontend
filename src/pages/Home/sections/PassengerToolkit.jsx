import { Link } from "react-router-dom";
import {
  TicketIcon,
  ClockIcon,
  MapPinIcon,
  GiftIcon,
  CalendarIcon,
  ChevronRightIcon,
} from "../../../components/Icons.jsx";

const TOOLS = [
  {
    icon: TicketIcon,
    title: "My Tickets",
    description: "View your upcoming bookings, ticket information, and QR codes.",
    to: "/my-tickets",
  },
  {
    icon: ClockIcon,
    title: "Trip History",
    description: "Review your previous trips and booking records.",
    to: "/trip-history",
  },
  {
    icon: MapPinIcon,
    title: "Track Bus",
    description: "Check the location of your assigned bus when live tracking is available.",
    to: "/track-bus",
  },
  {
    icon: GiftIcon,
    title: "Rewards",
    description: "View your available rewards and points.",
    to: "/rewards",
  },
  {
    icon: CalendarIcon,
    title: "Schedules",
    description: "Check routes and departure times when planning your trip.",
    href: "#trip-search",
  },
];

// A guide-style list rather than a card grid -- deliberately different
// from the timeline above and the ticket/notes sections below it.
export default function PassengerToolkit() {
  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">
            Quick Guide
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">
            What can you do with SmartTransit?
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-500">
            Your passenger account gives you access to the tools you need before, during, and
            after your trip.
          </p>
        </div>

        <div className="mt-10 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {TOOLS.map(({ icon: Icon, title, description, to, href }) => {
            const content = (
              <>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
                  <Icon size={20} />
                </span>
                <span className="flex-1">
                  <span className="block font-display text-base font-semibold text-navy-950">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-500">{description}</span>
                </span>
                <ChevronRightIcon size={18} className="shrink-0 text-slate-300" />
              </>
            );
            const rowClasses =
              "flex items-center gap-4 px-5 py-5 transition-colors hover:bg-slate-50 sm:px-6";

            return to ? (
              <Link key={title} to={to} className={rowClasses}>
                {content}
              </Link>
            ) : (
              <a key={title} href={href} className={rowClasses}>
                {content}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
