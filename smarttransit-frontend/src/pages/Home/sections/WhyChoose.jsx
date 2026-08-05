import { BusIcon, WalletIcon, TicketIcon, ClockIcon, MapPinIcon, SearchIcon } from "../../../components/Icons.jsx";

const FEATURES = [
  {
    icon: BusIcon,
    title: "Real-Time GPS Tracking",
    description:
      "See exactly where your bus is on the map, down to the minute, on every Davao Region XI route.",
  },
  {
    icon: WalletIcon,
    title: "Cashless Payments",
    description:
      "Pay for your seat online through GCash — no exact change, no queuing at the terminal window.",
  },
  {
    icon: TicketIcon,
    title: "Guaranteed Seat Reservation",
    description:
      "Reserve your exact seat before boarding, so you're never left standing on a long provincial trip.",
  },
  {
    icon: ClockIcon,
    title: "Live Schedules & Delays",
    description:
      "Check updated departure times before you leave the house, not after you've already missed the bus.",
  },
  {
    icon: MapPinIcon,
    title: "Wide Terminal Coverage",
    description:
      "Routes connecting Davao City, Tagum, Panabo, Digos, and Mati terminals across the region.",
  },
  {
    icon: SearchIcon,
    title: "Digital Ticket & QR Boarding",
    description: "Your ticket lives on your phone. Just show your QR code to the conductor to board.",
  },
];

export default function WhyChoose() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">
            Why Ride With SmartTransit
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">
            Everything you need, in your pocket
          </h2>
          <p className="mt-3 text-base text-slate-500">
            Designed for daily commuters who want less hassle and more control over every trip.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-card-hover"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
                <Icon size={24} />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-navy-950">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
