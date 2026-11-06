import { Clock3, MapPin, ShieldCheck, Wallet } from 'lucide-react';
import { useRegion } from '../../../api/hooks/useRegion';
import Navbar from '../../Layout/Navbar';
import Footer from '../../Layout/Footer';
import Button from '../../ui/Button';
import TeamSection from './TeamSection';

const BENEFITS = [
  {
    icon: Clock3,
    title: 'Save time',
    description: 'Check the schedule and choose your bus before you ever leave the house.',
  },
  {
    icon: Wallet,
    title: 'Pay with ease',
    description: 'Cashless GCash and Maya payments mean no exact change and no queuing at the window.',
  },
  {
    icon: MapPin,
    title: 'Stay informed',
    description: 'Live GPS tracking shows where a bus is on every active route.',
  },
  {
    icon: ShieldCheck,
    title: 'Travel with confidence',
    description: 'A digital QR ticket for every seat, checked when you board.',
  },
];

// Layout adapted from the teammate's About page. The region name comes from the server; the copy
// names no route or city of its own.
export default function AboutPage() {
  const region = useRegion();
  const place = region?.name || 'the region';

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        {/* Photo banner with a slanted left edge */}
        <div className="bg-white">
          <div
            className="relative h-56 overflow-hidden rounded-bl-[2.5rem] sm:h-72 lg:h-[26rem]"
            style={{ clipPath: 'polygon(4% 0, 100% 0, 100% 100%, 0 100%)' }}
          >
            <img
              src="/images/about-davao.jpg"
              alt="Aerial view of a coastal city with a gulf and mountains in the distance"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <section className="bg-white pb-16 pt-12 sm:pb-20 sm:pt-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <h1 className="font-display text-4xl font-extrabold uppercase tracking-[0.12em] text-navy-950 sm:text-6xl">
              About SmartTransit
            </h1>

            <div className="mt-8 max-w-3xl">
              <h2 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">
                Built for commuters travelling across {place}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                SmartTransit is a bus transportation platform for the daily commuting routes of {place}. Instead of
                guessing when the next bus arrives or lining up at a terminal window, riders can see the
                schedule, choose a bus, and pay for their trip before they leave the house.
              </p>
            </div>
          </div>
        </section>

        {/* 2026-11-07 (passenger redesign, joshua-frontend): tinted round photos over grey bands that run to opposite
            edges on wide screens; one grey card each on phones. */}
        <section className="overflow-hidden bg-white pb-16 sm:pb-20">
          <div className="relative">
            <div className="absolute inset-y-6 left-[38%] right-0 hidden bg-slate-100 lg:block" aria-hidden="true" />
            <div className="container-page relative grid items-center gap-8 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <h2 className="font-display text-4xl font-extrabold leading-tight text-navy-950 sm:text-5xl">Our Mission<br />&amp; Vision</h2>
                <span className="mt-5 block h-1 w-24 rounded-full bg-navy-900" aria-hidden="true" />
                <span className="mt-1.5 block h-1 w-24 rounded-full bg-teal-400" aria-hidden="true" />
              </div>
              <div className="flex flex-col items-center gap-6 rounded-2xl bg-slate-100 p-6 sm:flex-row lg:col-span-8 lg:gap-10 lg:rounded-none lg:bg-transparent lg:p-0">
                <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-full sm:h-52 sm:w-52 lg:h-60 lg:w-60">
                  <img src="/images/about/bus-terminal.jpg" alt="" className="h-full w-full object-cover grayscale" />
                  <span className="absolute inset-0 bg-navy-800/45 mix-blend-multiply" aria-hidden="true" />
                </div>
                <div className="max-w-md">
                  <h3 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">Mission</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                    To make provincial bus travel{region?.name ? ` across ${region.name}` : ''} simpler, safer, and more transparent, by giving every
                    passenger real-time information and control over their own trip, from booking to boarding.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-10 lg:mt-14">
            <div className="absolute inset-y-6 left-0 right-[40%] hidden bg-slate-100 lg:block" aria-hidden="true" />
            <div className="container-page relative grid items-center lg:grid-cols-12">
              <div className="flex flex-col-reverse items-center gap-6 rounded-2xl bg-slate-100 p-6 sm:flex-row lg:col-span-8 lg:justify-end lg:gap-10 lg:rounded-none lg:bg-transparent lg:p-0">
                <div className="max-w-md sm:text-right">
                  <h3 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">Vision</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                    A region where no commuter has to wonder if the bus has already left, where a seat can be
                    reserved in advance, and where public transportation feels as reliable and convenient as any
                    other digital service.
                  </p>
                </div>
                <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-full sm:h-52 sm:w-52 lg:h-60 lg:w-60">
                  <img src="/images/about/gps-map.jpg" alt="" className="h-full w-full object-cover grayscale" />
                  <span className="absolute inset-0 bg-teal-400/70 mix-blend-multiply" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">Why SmartTransit Exists</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">
                Passenger benefits, built on real transportation technology
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-500">
                Commuters have long relied on terminal windows and word of mouth to plan a trip. SmartTransit
                brings that experience online: GPS tracking, digital ticketing, and cashless payments, so every
                rider knows what to expect before they reach the terminal.
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map(({ icon: Icon, title, description }) => (
                <div key={title} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
                    <Icon size={22} aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold text-navy-950">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <TeamSection regionName={region?.name} />

        <section className="bg-navy-950 px-4 py-14 text-center sm:px-6 lg:px-10">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Ready to plan your trip?</h2>
            <p className="mt-2 text-sm text-slate-300">Search the next buses for your journey and book a seat.</p>
            <div className="mt-6">
              <Button to="/#search-trips" variant="accent" size="md">Search trips</Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
