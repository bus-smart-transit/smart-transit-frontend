import { useState } from "react";
import PublicLayout from "../../components/PublicLayout.jsx";
import {
  MapPinIcon,
  ShieldIcon,
  ClockIcon,
  WalletIcon,
} from "../../components/Icons.jsx";

const BENEFITS = [
  {
    icon: ClockIcon,
    title: "Save time",
    description: "Check live schedules and book your trip before you ever leave the house.",
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
    description: "A confirmed booking and digital ticket mean your spot on the trip is secured before you arrive.",
  },
];

// Replace names/roles with the real team. To use a photo, drop it in
// public/images/team/ and set `photo: "/images/team/<file>.jpg"`.
const TEAM = [
  { name: "De Vila", role: "Project Manager", photo: null },
  { name: "Jhon Michael Murcia", role: "Backend Developer", photo: null },
  { name: "Ang", role: "Frontend Developer", photo: null },
  { name: "Joshua Galo", role: "UI/UX Designer", photo: null },
  { name: "Hassanal", role: "QA & Documentation", photo: null },
];

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AboutPage() {
  return (
    <PublicLayout>
      {/* Photo banner with a slanted left edge */}
      <div className="bg-white">
        <div
          className="relative h-56 overflow-hidden rounded-bl-[2.5rem] sm:h-72 lg:h-[26rem]"
          style={{ clipPath: "polygon(4% 0, 100% 0, 100% 100%, 0 100%)" }}
        >
          <img
            src="/images/about-davao.jpg"
            alt="Aerial view of Davao City with the Davao Gulf and mountains in the distance"
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <section className="bg-white pb-16 pt-12 sm:pb-20 sm:pt-16">
        <div className="container-page">
          <h1 className="font-display text-4xl font-extrabold uppercase tracking-[0.12em] text-navy-950 sm:text-6xl">
            About SmartTransit
          </h1>

          <div className="mt-8">
            <h2 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">
              Built for commuters travelling across Davao Region XI
            </h2>
            <p className="mt-4 text-justify text-base leading-relaxed text-slate-600 [hyphens:auto] sm:text-lg">
              SmartTransit is a bus transportation platform focused on the daily commuting routes
              connecting Davao City to Tagum, Panabo, Digos, and Mati. Instead of guessing when the
              next bus arrives or lining up at a terminal window, riders can check live schedules,
              book a trip, and pay for it before they ever leave the house.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision: tinted circle photos overlapping grey bands that
          bleed to opposite edges of the screen on desktop. */}
      <section className="overflow-hidden bg-white pb-16 sm:pb-20">
        {/* Mission row -- band runs to the right edge */}
        <div className="relative">
          <div className="absolute inset-y-6 left-[38%] right-0 hidden bg-slate-100 shadow-[0_3px_0_rgba(15,23,42,0.06)] lg:block" />
          <div className="container-page relative grid items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="font-display text-4xl font-extrabold leading-tight text-navy-950 sm:text-5xl">
                Our Mission
                <br />& Vision
              </h2>
              <span className="mt-5 block h-1 w-24 rounded-full bg-navy-900" />
              <span className="mt-1.5 block h-1 w-24 rounded-full bg-teal-400" />
            </div>
            <div className="flex flex-col items-center gap-6 rounded-2xl bg-slate-100 p-6 sm:flex-row lg:col-span-8 lg:gap-10 lg:rounded-none lg:bg-transparent lg:p-0">
              <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-full sm:h-52 sm:w-52 lg:h-60 lg:w-60">
                <img
                  src="/images/news/bus-terminal.jpg"
                  alt="Passenger boarding a bus at a terminal"
                  className="h-full w-full object-cover grayscale"
                />
                <span className="absolute inset-0 bg-navy-800/45 mix-blend-multiply" />
              </div>
              <div className="max-w-md">
                <h3 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">
                  Mission
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                  To make provincial bus travel across Davao Region XI simpler, safer, and more
                  transparent, by giving every passenger real-time information and control over
                  their own trip, from booking to boarding.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Vision row -- band runs to the left edge, text right-aligned */}
        <div className="relative mt-10 lg:mt-14">
          <div className="absolute inset-y-6 left-0 right-[40%] hidden bg-slate-100 shadow-[0_3px_0_rgba(15,23,42,0.06)] lg:block" />
          <div className="container-page relative grid items-center lg:grid-cols-12">
            <div className="flex flex-col-reverse items-center gap-6 rounded-2xl bg-slate-100 p-6 sm:flex-row lg:col-span-8 lg:justify-end lg:gap-10 lg:rounded-none lg:bg-transparent lg:p-0">
              <div className="max-w-md sm:text-right">
                <h3 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">
                  Vision
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                  A Davao Region where no commuter has to wonder if the bus has already left,
                  where every trip can be booked in advance, and where public transportation
                  feels as reliable and convenient as any other digital service.
                </p>
              </div>
              <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-full sm:h-52 sm:w-52 lg:h-60 lg:w-60">
                <img
                  src="/images/news/gps-map.jpg"
                  alt="Phone showing a live map"
                  className="h-full w-full object-cover grayscale"
                />
                <span className="absolute inset-0 bg-teal-400/70 mix-blend-multiply" />
              </div>
            </div>
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

      <TeamSection />

    </PublicLayout>
  );
}

const DOT_PATTERN = {
  backgroundImage: "radial-gradient(circle, rgb(148 163 184 / 0.55) 1px, transparent 1.6px)",
  backgroundSize: "10px 10px",
  maskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
  WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
};

function TeamSection() {
  const middle = Math.floor(TEAM.length / 2);
  const [active, setActive] = useState(middle);

  return (
    <section className="relative overflow-hidden bg-white py-16 sm:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 top-6 h-72 w-80 sm:left-6"
        style={DOT_PATTERN}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 top-6 h-72 w-80 sm:right-6"
        style={DOT_PATTERN}
      />

      <div className="container-page relative">
        <div className="mx-auto max-w-xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            The people behind SmartTransit
          </span>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-navy-950 sm:text-5xl">
            Meet Our Team
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-500">
            A small team building a simpler, more reliable way to ride across Davao Region XI.
          </p>
        </div>

        <ul
          className="-mx-4 mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 sm:mx-0 sm:justify-center sm:overflow-visible sm:px-0 lg:gap-5"
          onMouseLeave={() => setActive(middle)}
        >
          {TEAM.map(({ name, role, photo }, index) => {
            const isActive = index === active;
            const offset = Math.abs(index - middle) * 18;
            return (
              <li
                key={name}
                onMouseEnter={() => setActive(index)}
                className="w-40 shrink-0 snap-center sm:w-[18%] sm:max-w-[13rem] sm:translate-y-[var(--offset)]"
                style={{ "--offset": `${offset}px` }}
              >
                <div
                  className={`relative aspect-[4/5] overflow-hidden rounded-2xl transition-all duration-500 ${
                    isActive
                      ? "scale-105 shadow-[0_20px_50px_-12px_rgba(167,139,250,0.55)]"
                      : "shadow-sm"
                  }`}
                >
                  {photo ? (
                    <img
                      src={photo}
                      alt={name}
                      className={`h-full w-full object-cover transition duration-500 ${
                        isActive ? "grayscale-0" : "grayscale"
                      }`}
                    />
                  ) : (
                    <span
                      className={`flex h-full w-full items-start justify-center pt-[22%] font-display text-4xl font-bold transition-colors duration-500 ${
                        isActive
                          ? "bg-gradient-to-br from-amber-100 via-rose-100 to-violet-300 text-violet-900/70"
                          : "bg-gradient-to-b from-slate-100 to-slate-300 text-slate-400"
                      }`}
                    >
                      {initials(name)}
                    </span>
                  )}

                  <div className="absolute inset-x-2 bottom-2 rounded-lg border border-white/40 bg-slate-900/25 px-3 py-2 text-left backdrop-blur-md">
                    <h3 className="truncate text-sm font-semibold text-white">{name}</h3>
                    <p className="truncate text-xs text-white/80">{role}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
