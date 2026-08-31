import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import LandingHero from './LandingHero';
import TripResultsSection from './TripResultsSection';
import WhyRideSection from './WhyRideSection';
import PassengerService from '../../../api/PassengerService/PassengerService';

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchState, setSearchState] = useState({ from: '', to: '', date: '' });
  const [trips, setTrips] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async ({ from, to, date }) => {
    setSearchState({ from, to, date });
    setLoading(true);
    setSearchError(null);
    setHasSearched(true);
    try {
      const params = {};
      if (date) params.trip_date = date;
      const res = await PassengerService.getAvailableTrips(params);
      const allTrips = Array.isArray(res) ? res : (res?.data ?? []);
      // Filter by origin/destination text if provided
      const filtered = allTrips.filter((t) => {
        const origin = (t.fleet_route?.route?.origin_stop?.stop_name ?? t.fleet_route?.origin_stop_name ?? '').toLowerCase();
        const dest = (t.fleet_route?.route?.destination_stop?.stop_name ?? t.fleet_route?.destination_stop_name ?? '').toLowerCase();
        const fromMatch = !from || origin.includes(from.toLowerCase()) || from.toLowerCase().includes(origin.split(' ')[0]);
        const toMatch = !to || dest.includes(to.toLowerCase()) || to.toLowerCase().includes(dest.split(' ')[0]);
        return fromMatch && toMatch;
      });
      setTrips(filtered.length > 0 ? filtered : allTrips);
    } catch {
      setSearchError('Unable to load trips. Please try again.');
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBookSeat = useCallback((trip) => {
    // Redirect to login with trip state — authenticated flow handles booking
    navigate('/passenger/login', { state: { redirectToBuy: true, tripId: trip?.id } });
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        <LandingHero onSearch={handleSearch} searchState={searchState} />

        {hasSearched && (
          <TripResultsSection
            trips={trips}
            loading={loading}
            error={searchError}
            searchState={searchState}
            onBookSeat={handleBookSeat}
          />
        )}

        {!hasSearched && <WhyRideSection />}
      </main>

      <Footer />
    </div>
  );
}
