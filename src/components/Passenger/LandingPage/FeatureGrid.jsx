import { Bus, Route, ShieldCheck, Ticket } from 'lucide-react';

const FEATURES = [
  {
    icon: Bus,
    title: 'Real-Time Arrivals',
    desc: 'Track active buses and get minute-by-minute updates before boarding.',
  },
  {
    icon: Ticket,
    title: 'Digital Ticketing',
    desc: 'Book and pay in one flow with secure checkout and instant confirmation.',
  },
  {
    icon: Route,
    title: 'Route-Aware Search',
    desc: 'Search by current location and destination to view the best route options.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Ride Data',
    desc: 'Every trip status is synchronized with fleet operations and driver updates.',
  },
];

export default function FeatureGrid() {
  return (
    <section
      className="px-4 py-14 sm:px-6 lg:px-10"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <h2
            id="features-heading"
            className="text-2xl font-bold text-slate-100 sm:text-3xl"
          >
            Everything you need to ride
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Built for daily commuters and occasional travellers alike.
          </p>
        </div>

        {/* Equal-height cards via CSS Grid stretch (default align-items) */}
        <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <article
              key={title}
              className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-700"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-sky-300">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-100">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
