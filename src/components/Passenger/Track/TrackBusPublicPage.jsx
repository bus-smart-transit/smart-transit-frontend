import { Link } from 'react-router-dom';
import { Ticket } from 'lucide-react';
import Navbar from '../../Layout/Navbar';
import Footer from '../../Layout/Footer';
import PublicTrackingSection from '../LandingPage/PublicTrackingSection';

/**
 * 2026-11-06 (passenger redesign, joshua-frontend): the Track Bus page. The live map and the running buses moved
 * here from the homepage; it works without an account, as before. A passenger with a booking can follow their own
 * bus with its tracking code (Track my bus, or the /track page).
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
            <Link to="/track" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-navy-800 hover:bg-slate-50">
              <Ticket className="h-4 w-4" aria-hidden="true" /> Track with a booking code
            </Link>
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
