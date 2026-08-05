import Navbar from './Navbar';
import Hero from './Hero';
import StatsStrip from './StatsStrip';
import FeatureGrid from './FeatureGrid';
import PassengerEntryCard from './PassengerEntryCard';
import OperationsAccessCard from './OperationsAccessCard';
import Footer from './Footer';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-200">
      <Navbar />

      <main className="flex-1">
        {/* Hero — large split layout with search card as primary action */}
        <Hero />

        {/* Live status strip — lightweight stats, not competing card grid */}
        <StatsStrip />

        {/* Features — equal-height 2×2 grid with normal document flow */}
        <FeatureGrid />

        {/* Access section — Passenger (prominent) + Operations (secondary) */}
        <section
          className="px-4 pb-16 pt-2 sm:px-6 lg:px-10"
          aria-label="Get started"
        >
          <div className="mx-auto max-w-7xl">
            {/* 3-column grid: passenger takes 2 cols, operations takes 1 */}
            <div className="grid items-start gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <PassengerEntryCard />
              </div>
              <div>
                <OperationsAccessCard />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
