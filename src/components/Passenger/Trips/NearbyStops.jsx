import { MapPin } from 'lucide-react';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import { distanceText } from '../../../utils/homeLocation';

/**
 * Batch 54 (user, 2026-11-10): "Stops near you" above the list on All available trips. It never hides a trip: each
 * stop's button narrows the list to trips from there. Before the browser is allowed, a pop-up asks to turn location
 * on. Renders only; AvailableTripsPage passes useNearbyLocation and the nearest stops.
 */
export default function NearbyStops({ location, stops, radiusKm, onShowFrom }) {
  return (
    <>
      <Modal open={location.askOpen} onClose={location.notNow} title="Find stops near you" size="sm">
        <div className="space-y-4 text-center" data-testid="nearby-location-ask">
          <MapPin className="mx-auto h-8 w-8 text-teal-600" aria-hidden="true" />
          <p className="text-sm text-slate-600">Turn on location to see the bus stops closest to you first. Your location stays on this device.</p>
          <div className="flex justify-center gap-2">
            <Button type="button" variant="primary" onClick={location.allow}>Turn on location</Button>
            <Button type="button" variant="secondary" onClick={location.notNow}>Not now</Button>
          </div>
        </div>
      </Modal>

      <section aria-label="Stops near you" data-testid="nearby-stops" className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-200">
        <h2 className="font-display text-base font-bold text-navy-950">Stops near you</h2>
        {location.status === 'locating' && <p role="status" className="mt-2 text-sm text-slate-500">Finding where you are...</p>}
        {location.status === 'denied' && <p className="mt-2 text-sm text-slate-500">Location is off. Turn it on in your browser settings to see stops near you.</p>}
        {location.status === 'unavailable' && <p className="mt-2 text-sm text-slate-500">Your location is not available on this device.</p>}
        {location.status === 'idle' && (
          <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>Turn on location to see the bus stops closest to you.</span>
            <Button type="button" variant="outline" size="sm" onClick={location.locate}>Turn on location</Button>
          </p>
        )}
        {location.status === 'ready' && stops.length === 0 && (
          <p className="mt-2 text-sm text-slate-500">No bus stop within {radiusKm} km of you. Every trip is listed below.</p>
        )}
        {location.status === 'ready' && stops.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100">
            {stops.map(({ stop, meters }) => (
              <li key={stop.stop_id} data-testid="nearby-stop" className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-950">{stop.name}</p>
                  <p className="text-xs text-slate-500">{distanceText(meters)}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => onShowFrom(stop)}>Trips from here</Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
