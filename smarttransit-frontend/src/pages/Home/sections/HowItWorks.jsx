import { SearchIcon, ClockIcon, GridIcon, WalletIcon, TicketIcon } from "../../../components/Icons.jsx";

const STEPS = [
  {
    number: "01",
    icon: SearchIcon,
    title: "Search for a Trip",
    description: "Choose your origin, destination, and travel date using the Search Trips section.",
  },
  {
    number: "02",
    icon: ClockIcon,
    title: "Choose Your Schedule",
    description: "Review the available trips and select the schedule that works best for you.",
  },
  {
    number: "03",
    icon: GridIcon,
    title: "Reserve Your Seat",
    description: "Choose an available seat and review your trip details.",
  },
  {
    number: "04",
    icon: WalletIcon,
    title: "Complete Your Payment",
    description: "Follow the available payment process to confirm your reservation.",
  },
  {
    number: "05",
    icon: TicketIcon,
    title: "Get Your Digital Ticket",
    description: "After your booking is confirmed, your digital ticket and QR code will be available in your account.",
  },
];

// Same five steps, rendered twice: a vertical connected timeline for
// mobile/tablet, and a horizontal connected timeline for desktop.
// Simpler and less error-prone than one layout trying to do both.
export default function HowItWorks() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">
            How SmartTransit Works
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">
            Your trip, made simple.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-500">
            New to SmartTransit? Follow these simple steps to find a trip, reserve your seat,
            complete your booking, and board with your digital ticket.
          </p>
        </div>

        {/* Vertical connected timeline -- mobile & tablet */}
        <ol className="mt-12 lg:hidden">
          {STEPS.map(({ number, icon: Icon, title, description }, index) => (
            <li key={number} className="relative flex gap-4 pb-10 last:pb-0">
              {index !== STEPS.length - 1 && (
                <span
                  className="absolute left-5 top-10 bottom-0 w-px bg-slate-200"
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-navy-800 bg-white text-sm font-bold text-navy-800">
                {number}
              </span>
              <div className="pt-1.5">
                <div className="flex items-center gap-2">
                  <Icon size={16} className="text-teal-600" />
                  <h3 className="font-display text-base font-semibold text-navy-950">{title}</h3>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Horizontal connected timeline -- desktop */}
        <ol className="relative mt-14 hidden lg:grid lg:grid-cols-5 lg:gap-6">
          <span className="absolute left-0 right-0 top-5 h-px bg-slate-200" aria-hidden="true" />
          {STEPS.map(({ number, icon: Icon, title, description }) => (
            <li key={number} className="relative pr-4">
              <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-navy-800 bg-white text-sm font-bold text-navy-800">
                {number}
              </span>
              <div className="mt-4 flex items-center gap-2">
                <Icon size={16} className="text-teal-600" />
                <h3 className="font-display text-sm font-semibold text-navy-950">{title}</h3>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
