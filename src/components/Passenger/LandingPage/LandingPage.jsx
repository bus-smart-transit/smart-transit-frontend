import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import LandingHero from './LandingHero';
import TripResultsSection from './TripResultsSection';
import WhyRideSection from './WhyRideSection';
import PublicTrackingSection from './PublicTrackingSection';
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
      const normalizedFrom = (from || '').trim().toLowerCase();
      const normalizedTo = (to || '').trim().toLowerCase();
      const sameDayOrFutureTrips = allTrips.filter((trip) => {
        const tripDate = trip?.trip_date ? new Date(trip.trip_date) : null;
        if (!tripDate || Number.isNaN(tripDate.getTime())) return true;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return tripDate >= today;
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

        {hasSearched && (
          <TripResultsSection
            trips={trips}
            loading={loading}
            error={searchError}
            searchState={searchState}
            onBookSeat={handleBookSeat}
          />
        )}

        <PublicTrackingSection />

        {!hasSearched && <WhyRideSection />}
      </main>

      <Footer />
    </div>
  );
}
