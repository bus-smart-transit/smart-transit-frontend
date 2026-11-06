import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../../Layout/Navbar';
import Footer from '../../Layout/Footer';
import LandingHero from './LandingHero';
import ProvincesSection from './ProvincesSection';
import HowItWorksSection from './HowItWorksSection';
import DigitalTicketSection from './DigitalTicketSection';
import BeforeYouTravelSection from './BeforeYouTravelSection';
import HomeFaqSection from './HomeFaqSection';
import AccountDeletionNotice from '../../Account/AccountDeletionNotice';

/**
 * 2026-11-06 (passenger redesign, joshua-frontend): search, the provinces, how it works, the digital ticket, notes
 * and the FAQ. Live bus tracking moved to its own page (/track-bus); "What you can do", "Why ride" and "Need help"
 * were dropped with the new design.
 */
export default function LandingPage() {
  const { hash } = useLocation();

  // Client-side navigation does not scroll to #anchors on its own (for example Back to Search).
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <AccountDeletionNotice />

      <main className="flex-1">
        <LandingHero />
        <ProvincesSection />
        <HowItWorksSection />
        <DigitalTicketSection />
        <BeforeYouTravelSection />
        <HomeFaqSection />
      </main>

      <Footer />
    </div>
  );
}
