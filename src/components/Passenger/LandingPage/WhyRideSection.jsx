import { Bus, Ticket, MapPin, ShieldCheck, CreditCard, Clock } from 'lucide-react';

const FEATURES = [
  {
    icon: Bus,
    title: 'Real-Time GPS Tracking',
    desc: 'Track your bus live on the map. Know exactly where it is before you head to the terminal.',
  },
  {
    icon: Ticket,
    title: 'Digital Tickets',
    desc: 'Book, pay, and get your QR ticket instantly. No printing needed — just show your phone.',
  },
  {
    icon: MapPin,
    title: 'Live Route Visibility',
    desc: 'See the full route, stops, and estimated arrival times in real time.',
  },
  {
    icon: CreditCard,
    title: 'Secure Online Payment',
    desc: 'Pay with GCash or card. All transactions are encrypted and verified.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Operator Data',
    desc: 'Every trip and fleet is registered and verified by SmartTransit operations.',
  },
  {
    icon: Clock,
    title: 'Schedule Alerts',
    desc: 'Get notified before your bus departs so you never miss your ride.',
  },
];

export default function WhyRideSection() {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Heading */}
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">
            Why Ride With Passenger
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-slate-900 sm:text-4xl">
            Everything you need, in your pocket
          </h2>
          <p className="mt-3 mx-auto max-w-xl text-base text-slate-500">
            Designed for daily commuters who want less hassle and more control over every trip.
          </p>
        </div>

        {/* 3-column card grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-6 transition hover:border-teal-200 hover:shadow-sm"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
