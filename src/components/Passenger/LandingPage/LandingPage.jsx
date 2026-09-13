import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import PassengerService from '../../../api/PassengerService/PassengerService';
import { getBusinessToday } from '../../../utils/dates';

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchState, setSearchState] = useState({ from: '', to: '', date: '' });
  const [trips, setTrips] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const handleSearch = useCallback(async ({ from, to, date }) => {
    setSearchState({ from, to, date });
    setLoading(true);
    setSearchError(null);
    try {
      const params = {};
      if (date) params.trip_date = date;
      const res = await PassengerService.getAvailableTrips(params);
      const allTrips = Array.isArray(res) ? res : (res?.data ?? []);
      const normalizedFrom = (from || '').trim().toLowerCase();
      const normalizedTo = (to || '').trim().toLowerCase();
      const sameDayOrFutureTrips = allTrips.filter((trip) => {
        const tripDateStr = String(trip?.trip_date || '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
        if (!tripDateStr) return true;
        return tripDateStr >= getBusinessToday();
      });
      const filtered = sameDayOrFutureTrips.filter((t) => {
        const route = t?.fleet_route?.route ?? {};
        const origin = (route?.origin_stop?.stop_name ?? route?.origin ?? t.fleet_route?.origin_stop_name ?? '').toLowerCase();
        const dest = (route?.destination_stop?.stop_name ?? route?.destination ?? t.fleet_route?.destination_stop_name ?? '').toLowerCase();
        const originWords = origin.split(/\s+/).filter(Boolean);
        const destWords = dest.split(/\s+/).filter(Boolean);
        const fromMatch = !normalizedFrom || origin.includes(normalizedFrom) || originWords.some((word) => normalizedFrom.includes(word));
        const toMatch = !normalizedTo || dest.includes(normalizedTo) || destWords.some((word) => normalizedTo.includes(word));
        return fromMatch && toMatch;
      });
      setTrips(filtered.length > 0 || (!normalizedFrom && !normalizedTo) ? filtered : allTrips);
    } catch {
      setSearchError('Unable to load trips. Please try again.');
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Show "All Available Trips" by default (not gated behind an explicit
  // search action), matching the current design — reuses the same fetch
  // logic that an explicit search would use, just with empty filters.
  useEffect(() => {
    void handleSearch({ from: '', to: '', date: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBookSeat = useCallback((trip) => {
    const tripId = trip?.trip_id ?? trip?.id;
    const query = tripId ? `?trip_id=${encodeURIComponent(String(tripId))}` : '';
    navigate(`/passenger/book${query}`, { state: { tripId } });
  }, [navigate]);

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
