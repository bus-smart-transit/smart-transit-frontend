import {
  BusIcon,
  WalletIcon,
  TicketIcon,
  ClockIcon,
  MapPinIcon,
  SearchIcon,
} from "../../components/Icons.jsx";
import "./WhyChoose.css";

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
    description:
      "Your ticket lives on your phone. Just show your QR code to the conductor to board.",
  },
];

export default function WhyChoose() {
  return (
    <section className="why-choose">
      <div className="container">
        <p className="why-choose__eyebrow">WHY RIDE WITH SMARTTRANSIT</p>
        <h2 className="why-choose__title">Everything you need, in your pocket</h2>
        <p className="why-choose__subtitle">
          Designed for daily commuters who want less hassle and more control
          over every trip.
        </p>

        <div className="why-choose__grid">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div className="feature-card" key={title}>
              <div className="feature-card__icon">
                <Icon size={26} />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
