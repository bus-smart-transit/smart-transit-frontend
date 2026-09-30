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
