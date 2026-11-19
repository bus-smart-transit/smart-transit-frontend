import Navbar from '../../Layout/Navbar';
import Footer from '../../Layout/Footer';
import PublicTrackingSection from '../LandingPage/PublicTrackingSection';

/**
 * 2026-11-06 (passenger redesign, joshua-frontend): the Track Bus page. The live map and the running buses moved
 * here from the homepage; it works without an account, as before. A passenger with a booking follows their own bus
 * with its tracking code (Track my bus). 2026-11-08 (user): the "Track with a booking code" link is gone (the same
 * thing as Track my bus); the /track page stays for links in emails.
 */
export default function TrackBusPublicPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 py-8 sm:py-10">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">Track Bus</h1>
              <p className="mt-1 text-sm text-slate-500">Follow any running SmartTransit bus on its route in real time. No account needed.</p>
            </div>
          </div>
        </div>
        <div className="container-page mt-6">
          <PublicTrackingSection showHeader={false} compact />
        </div>
      </main>
      <Footer />
    </div>
  );
}
