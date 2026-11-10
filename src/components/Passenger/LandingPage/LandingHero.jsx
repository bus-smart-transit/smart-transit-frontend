import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import Button from '../../ui/Button';
import JourneyFields from '../BuyTicket/JourneyFields';
import TripsPreview from '../Trips/TripsPreview';
import { useBookingStops } from '../../../api/hooks/Passenger/useBookingSearch';
import { useRegion } from '../../../api/hooks/useRegion';
import useHomeLocation from '../../../api/hooks/Passenger/useHomeLocation';
import LocationPrompt from './LocationPrompt';
import { buildBookingQuery, findStopCode, lastBookableDateOf, tripBookingPath } from '../../../utils/bookingQuery';

// 2026-11-06 (passenger redesign): Pexels photo 1178448, saved in public/images (Pexels licence: free to use).
const HERO_IMAGE = '/images/hero-bus.jpg';

const stopName = (groups, stopId) => groups.flatMap((group) => group.stops).find((stop) => String(stop.stop_id) === String(stopId))?.name || '';

export default function LandingHero() {
  const navigate = useNavigate();
  const region = useRegion();
  const [journey, setJourney] = useState({
    origin_stop_id: '',
    destination_stop_id: '',
    booking_date: '',
  });
  const stops = useBookingStops(journey.origin_stop_id);
  // Batch 51 items 2 and 3 (user): "Are you in {place}?"; Yes starts the list at the nearest stop within the radius.
  const location = useHomeLocation(stops.originGroups, region?.nearbyRadiusKm ?? 5);
  // Batch 52 item 1: the passenger's area after Yes ({ town, province, prefer }), or null.
  const [area, setArea] = useState(null);
  const [checking, setChecking] = useState('');
  const [noTripsIn, setNoTripsIn] = useState('');
  const promptPhase = checking ? 'checking' : noTripsIn ? 'none' : location.locating ? 'locating' : location.question ? 'question' : null;
  const answerYes = async () => {
    const answer = location.accept();
    if (answer.stop) handleChange('origin_stop_id', String(answer.stop.stop_id));
    if (!answer.area) return;
    setChecking(answer.area.town);
    const found = await location.hasTrips(answer.area, stops.today);
    setChecking('');
    if (found) setArea(answer.area);
    else setNoTripsIn(answer.area.town);
  };
  // The journey that was actually searched; the list below belongs to it, not to later edits.
  const [search, setSearch] = useState(null);
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
  const maxDate = lastBookableDateOf(stops);
  const dateOk = Boolean(date) && date >= stops.today && (!maxDate || date <= maxDate);

  const fromCode = findStopCode(stops.originGroups, journey.origin_stop_id);
  const toCode = findStopCode(stops.destinationGroups, journey.destination_stop_id);
  const fromName = stopName(stops.originGroups, journey.origin_stop_id);
  const toName = stopName(stops.destinationGroups, journey.destination_stop_id);
  const canSearch = Boolean(fromCode && toCode && dateOk);

  // Search needs both stops. It lists a few trips right here, for the day searched, and the
  // "See all available trips" link opens the All Available Trips page for the same journey.
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSearch) return;
    setSearch({ date, fromCode, toCode, fromName, toName });
  };

  return (
    <section>
      {/* 2026-11-06 (passenger redesign, joshua-frontend): a full-width photo with the title in the middle and
          rounded lower corners. Its height comes from the text inside it, never from the search card below. */}
      <div className="relative isolate overflow-hidden rounded-b-[32px] bg-navy-900 sm:rounded-b-[48px]">
        <div className="absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: `url(${HERO_IMAGE})` }} aria-hidden="true" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-950/50 via-navy-900/40 to-navy-950/70" aria-hidden="true" />

        <div className="container-page flex min-h-[380px] flex-col items-center justify-center pb-32 pt-16 text-center sm:min-h-[460px] sm:pb-40 lg:min-h-[520px]">
          {region?.name && <p className="font-display text-lg font-medium text-white/90 sm:text-3xl">Travel across {region.name}</p>}
          <h1 className="mt-2 font-display text-5xl font-extrabold uppercase leading-none tracking-wide text-white sm:text-7xl lg:text-8xl">
            Ride Smarter
          </h1>
          <p className="mt-5 text-sm font-medium text-white/85 sm:text-base">Book your trip, track your bus, and arrive on time.</p>
        </div>
      </div>

      {/* The card overlaps the picture's lower edge and is free to grow downward; the suggestion lists
          open over the page (absolute), so opening one does not change the card's height either. */}
      <div id="search-trips" className="relative z-10 -mt-24 scroll-mt-24 sm:-mt-28">
        <div className="container-page">
          <div className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
            <h2 className="font-display text-lg font-semibold text-navy-950">Search Trips</h2>
            <p className="mt-0.5 text-sm text-slate-500">Choose where you board, where you get off and the day. Sign in to complete a booking.</p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              {stops.error && <p className="text-sm text-red-600">{stops.error}</p>}
              <JourneyFields
                value={{ ...journey, booking_date: date }}
                originGroups={stops.originGroups}
                destinationGroups={stops.destinationGroups}
                loadingDestinations={stops.loadingDestinations}
                today={stops.today}
                maxAdvanceDays={stops.maxAdvanceDays}
                lastBookableDate={stops.lastBookableDate}
                onChange={handleChange}
                idPrefix="hero"
                action={(
                  <Button type="submit" variant="primary" size="lg" icon={Search} disabled={!canSearch} className="w-full lg:w-auto">
                    Search
                  </Button>
                )}
              />
            </form>
          </div>
        </div>
      </div>

      {location.note && (
        <div className="container-page mt-4">
          <p role="status" className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-inset ring-slate-200" data-testid="location-note">{location.note}</p>
        </div>
      )}
      {/* Batch 53 item 4 (user): "Are you in {place}?" as a pop-up, with a loading animation, and Show all trips when
          the area has no trip today. */}
      <LocationPrompt
        phase={promptPhase}
        question={location.question}
        place={noTripsIn}
        onYes={answerYes}
        onNo={location.decline}
        onShowAll={() => navigate(`/passenger/trips?${buildBookingQuery({ date: stops.today })}`, { state: { returnTo: '/' } })}
        onClose={() => { setNoTripsIn(''); if (location.question) location.decline(); }}
      />
      <TripsPreview
        today={stops.today}
        previewLimit={stops.previewLimit}
        live={{ date, fromCode, toCode, fromName, toName }}
        area={area}
        onClearArea={() => setArea(null)}
        search={search}
        onBook={(trip) => navigate(tripBookingPath(trip), { state: { returnTo: '/' } })}
      />
    </section>
  );
}
