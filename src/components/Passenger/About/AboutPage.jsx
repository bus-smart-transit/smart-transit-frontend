import { Clock3, MapPin, ShieldCheck, Wallet } from 'lucide-react';
import { useRegion } from '../../../api/hooks/useRegion';
import Navbar from '../../Layout/Navbar';
import Footer from '../../Layout/Footer';
import TeamSection from './TeamSection';

// 2026-11-18 (user): plainer wording — what a rider actually does, not slogans.
const BENEFITS = [
  {
    icon: Clock3,
    title: 'Know before you go',
    description: 'See the schedule and pick your bus before you leave the house.',
  },
  {
    icon: Wallet,
    title: 'Pay with GCash or Maya',
    description: 'No exact change, no line at the ticket window.',
  },
  {
    icon: MapPin,
    title: 'See where your bus is',
    description: 'Follow it on the map while it is on the road.',
  },
  {
    icon: ShieldCheck,
    title: 'Board with your phone',
    description: 'Your seat comes with a QR ticket. The conductor scans it at the door.',
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

            {/* 2026-11-18 (user): simpler words, and the paragraph runs the full width so its right edge lines up
                with the Mission text below. */}
            <div className="mt-8">
              <h2 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">
                Made for people who ride the bus in {place}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                SmartTransit lets you check the bus schedule, pick your bus and pay for your seat on your phone. No more
                guessing when the next bus comes, and no more waiting in line at the terminal window.
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
            {/* 2026-11-18 (user): centred, like the section headings on the homepage. */}
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">Why we built it</p>
              <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">
                Less waiting at the terminal
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-500">
                For years, the only way to know when the next bus leaves was to ask at the ticket window or ask
                someone who rode it. SmartTransit puts the schedule, the seats and the bus on a map in your phone,
                so you know what to expect before you get to the terminal.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map(({ icon: Icon, title, description }) => (
                // 2026-11-18 (user): the same filled navy → ocean card as "Before you travel" on the homepage.
                <div key={title} className="rounded-2xl bg-gradient-to-br from-navy-800 to-ocean p-6 text-white shadow-xl shadow-navy-900/15 transition duration-300 hover:-translate-y-1 hover:shadow-navy-900/25">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/80">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2026-11-18 (user): the "Ready to plan your trip?" banner after the team was removed. */}
        <TeamSection regionName={region?.name} />
      </main>

      <Footer />
    </div>
  );
}
