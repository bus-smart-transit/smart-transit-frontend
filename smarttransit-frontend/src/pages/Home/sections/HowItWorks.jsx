import { SearchIcon, TicketIcon, MapPinIcon, CheckCircleIcon } from "../../../components/Icons.jsx";

const STEPS = [
  {
    icon: SearchIcon,
    title: "Search & choose a trip",
    description: "Pick your origin, destination, and travel date to see every available trip.",
  },
  {
    icon: TicketIcon,
    title: "Pick a seat & pay online",
    description: "Reserve your exact seat and pay securely through GCash — no cash needed.",
  },
  {
    icon: MapPinIcon,
    title: "Track your bus live",
    description: "Follow your bus's current stop and estimated arrival time before it arrives.",
  },
  {
    icon: CheckCircleIcon,
    title: "Board with your QR ticket",
    description: "Show your digital ticket's QR code to the conductor and you're on your way.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">
            How SmartTransit Works
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">
            From search to boarding, in four steps
          </h2>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, description }, index) => (
            <div key={title} className="relative rounded-2xl bg-white p-6 shadow-card">
              <span className="absolute -top-3 left-6 flex h-7 w-7 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">
                {index + 1}
              </span>
              <div className="mt-3 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Icon size={22} />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-navy-950">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
