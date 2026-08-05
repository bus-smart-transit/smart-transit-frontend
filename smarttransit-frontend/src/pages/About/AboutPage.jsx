import PublicLayout from "../../components/PublicLayout.jsx";
import CtaSection from "../Home/sections/CtaSection.jsx";
import {
  MapPinIcon,
  ShieldIcon,
  SparklesIcon,
  ClockIcon,
  WalletIcon,
  BusIcon,
} from "../../components/Icons.jsx";

const STATS = [
  { value: "5", label: "Terminals across Davao Region XI" },
  { value: "24/7", label: "GPS tracking on active routes" },
  { value: "100%", label: "Online seat reservation" },
];

const BENEFITS = [
  {
    icon: ClockIcon,
    title: "Save time",
    description: "Check live schedules and reserve a seat before you ever leave the house.",
  },
  {
    icon: WalletIcon,
    title: "Pay with ease",
    description: "Cashless GCash payments mean no exact change and no queuing at the window.",
  },
  {
    icon: MapPinIcon,
    title: "Stay informed",
    description: "Live GPS tracking shows exactly where your bus is on every active route.",
  },
  {
    icon: ShieldIcon,
    title: "Travel with confidence",
    description: "Guaranteed seat reservations mean you're never left standing on a long trip.",
  },
];

export default function AboutPage() {
  return (
    <PublicLayout>
      <section className="bg-navy-900 py-16 sm:py-20">
        <div className="container-page">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">
            About SmartTransit
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold text-white sm:text-4xl">
            Built for commuters travelling across Davao Region XI
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-navy-200">
            SmartTransit is a bus transportation platform focused on the daily commuting routes
            connecting Davao City to Tagum, Panabo, Digos, and Mati. Instead of guessing when the
            next bus arrives or lining up at a terminal window, riders can check live schedules,
            reserve a seat, and pay for their trip before they ever leave the house.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {STATS.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
                <p className="font-display text-3xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-sm text-navy-200">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="container-page grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
              <SparklesIcon size={22} />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold text-navy-950">Our Mission</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              To make provincial bus travel across Davao Region XI simpler, safer, and more
              transparent, by giving every passenger real-time information and control over
              their own trip, from booking to boarding.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <BusIcon size={22} />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold text-navy-950">Our Vision</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              A Davao Region where no commuter has to wonder if the bus has already left, where
              every seat can be reserved in advance, and where public transportation feels as
              reliable and convenient as any other digital service.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">
              Why SmartTransit Exists
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">
              Passenger benefits, built on real transportation technology
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-500">
              Provincial commuters across Davao Region XI have long relied on terminal windows
              and word of mouth to plan a trip. SmartTransit brings that experience online — GPS
              tracking, digital ticketing, and cashless payments — so every rider knows exactly
              what to expect before they even reach the terminal.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-2xl bg-white p-6 shadow-card">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
                  <Icon size={22} />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-navy-950">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaSection />
    </PublicLayout>
  );
}
