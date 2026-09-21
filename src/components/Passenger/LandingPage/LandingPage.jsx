import Navbar from '../../Layout/Navbar';
import Footer from '../../Layout/Footer';
import LandingHero from './LandingHero';
import TripResultsSection from './TripResultsSection';
import WhyRideSection from './WhyRideSection';
import PublicTrackingSection from './PublicTrackingSection';
import HowItWorksSection from './HowItWorksSection';
import WhatYouCanDoSection from './WhatYouCanDoSection';
import DigitalTicketSection from './DigitalTicketSection';
import BeforeYouTravelSection from './BeforeYouTravelSection';
import HomeFaqSection from './HomeFaqSection';
import NeedHelpSection from './NeedHelpSection';
import { useLandingPage } from '../../../api/hooks/Passenger/useLandingPage';

export default function LandingPage() {
  const {
    searchState,
    trips,
    loading,
    searchError,
    handleSearch,
    handleBookSeat,
  } = useLandingPage();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        <LandingHero onSearch={handleSearch} searchState={searchState} />

        <TripResultsSection
          trips={trips ?? []}
          loading={loading}
          error={searchError}
          searchState={searchState}
          onBookSeat={handleBookSeat}
        />

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
