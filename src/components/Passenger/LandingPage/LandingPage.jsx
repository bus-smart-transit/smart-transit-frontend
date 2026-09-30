import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../../Layout/Navbar';
import Footer from '../../Layout/Footer';
import LandingHero from './LandingHero';
import WhyRideSection from './WhyRideSection';
import PublicTrackingSection from './PublicTrackingSection';
import HowItWorksSection from './HowItWorksSection';
import WhatYouCanDoSection from './WhatYouCanDoSection';
import DigitalTicketSection from './DigitalTicketSection';
import BeforeYouTravelSection from './BeforeYouTravelSection';
import HomeFaqSection from './HomeFaqSection';
import NeedHelpSection from './NeedHelpSection';

export default function LandingPage() {
  const { hash } = useLocation();

  // Client-side navigation does not scroll to #anchors on its own (for example Back to Search).
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        <LandingHero />

        <HowItWorksSection />

        <WhatYouCanDoSection />

        <DigitalTicketSection />

        <PublicTrackingSection />

        <BeforeYouTravelSection />

        <WhyRideSection />

        <HomeFaqSection />

        <NeedHelpSection />
      </main>

      <Footer />
    </div>
  );
}
