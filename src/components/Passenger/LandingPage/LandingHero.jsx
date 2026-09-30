import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import Button from '../../ui/Button';
import JourneyFields from '../BuyTicket/JourneyFields';
import { useBookingStops } from '../../../api/hooks/Passenger/useBookingSearch';
import { useRegion } from '../../../api/hooks/useRegion';
import { addDaysToDate, buildBookingQuery, findStopCode } from '../../../utils/bookingQuery';
import heroBg from '../../../assets/hero.png';

export default function LandingHero() {
  const navigate = useNavigate();
  const region = useRegion();
  const [journey, setJourney] = useState({
    origin_stop_id: '',
    destination_stop_id: '',
    booking_date: '',
  });
  const stops = useBookingStops(journey.origin_stop_id);
  // The date defaults to today in Manila (from the server) until the passenger picks another.
  const date = journey.booking_date || stops.today;

  const handleChange = (field, value) => {
    setJourney((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'origin_stop_id' ? { destination_stop_id: '' } : {}),
    }));
  };

  // Convenience only: the server re-checks the stops and the date.
  const maxDate = stops.today && stops.maxAdvanceDays ? addDaysToDate(stops.today, stops.maxAdvanceDays) : '';
  const dateOk = Boolean(date) && date >= stops.today && (!maxDate || date <= maxDate);
  const canSearch = Boolean(journey.origin_stop_id && journey.destination_stop_id && dateOk);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSearch) return;
    // The link carries readable stop codes and the date, never internal ids or the mode.
    const query = buildBookingQuery({
      from: findStopCode(stops.originGroups, journey.origin_stop_id),
      to: findStopCode(stops.destinationGroups, journey.destination_stop_id),
      date,
    });
    navigate(`/passenger/book?${query}`);
  };
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/80 via-navy-950/60 to-navy-950/40" aria-hidden="true" />

      <div className="relative px-4 pb-20 pt-14 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-teal-500/90 px-3 py-1 text-xs font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" aria-hidden="true" />
            REAL-TIME GPS ACTIVE
          </div>

          <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Ride smarter,<br />arrive on time.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-200 sm:text-lg">
            Track your bus, manage your trips, access your tickets, and enjoy a smarter public transit experience{region?.name ? ` across ${region.name}` : ''}.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="#search-trips" variant="accent" size="md">
              Get Started
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => navigate('/passenger/dashboard?tab=map')}
              className="border-white/40 bg-white/5 text-white hover:bg-white/15 hover:text-white"
            >
              Track a Bus
            </Button>
          </div>
        </div>
      </div>

      <div id="search-trips" className="relative -mt-4 px-4 pb-0 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Where are you going?</h2>
            <p className="mt-0.5 text-sm text-slate-500">Choose where you board, where you get off and the day. We find the bus.</p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              {stops.error && <p className="text-sm text-red-600">{stops.error}</p>}
              <JourneyFields
                value={{ ...journey, booking_date: date }}
                originGroups={stops.originGroups}
                destinationGroups={stops.destinationGroups}
                loadingDestinations={stops.loadingDestinations}
                today={stops.today}
                maxAdvanceDays={stops.maxAdvanceDays}
                onChange={handleChange}
                idPrefix="hero"
              />
              <Button type="submit" variant="primary" size="md" icon={Search} disabled={!canSearch}>
                Search
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
