import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../../ui/Modal';
import { crewOptionLabel, isPickable, sortForPicker } from '../../../utils/crewPicker';

const idOf = (person) => person?.company_user_id ?? person?.user_id ?? person?.id;

/**
 * Batch 46: "Assign crew" for a trip still waiting for its Driver and / or Chauffeur. Only the missing roles are
 * asked. The same pickers as scheduling: own staff only, Not Available people shown but not choosable.
 */
export default function AssignCrewModal({ trip, drivers, conductors, loadingDrivers, driversError, saving, msg, onClose, onAssign }) {
  const [driverId, setDriverId] = useState('');
  const [conductorId, setConductorId] = useState('');
  const needDriver = !trip.driver_id;
  const needChauffeur = !trip.conductor_id;
  const ready = (!needDriver || driverId) && (!needChauffeur || conductorId);

  const submit = async (event) => {
    event.preventDefault();
    await onAssign({ driverId, conductorId });
  };

  const selectClass = 'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60';

  return (
    <Modal open onClose={onClose} title={`Assign crew to Trip #${trip.trip_id}`}>
      <form className="space-y-4" onSubmit={submit}>
        <p className="text-sm text-slate-600">
          {trip.fleet_route?.route?.route_name || 'Route not provided'}, {String(trip.trip_date || '').slice(0, 10)} at {String(trip.departure_time || '').slice(0, 5) || 'Not provided'}.
          The trip can start boarding once it has both.
        </p>
        {needDriver && (
          <div>
            <label htmlFor="assign-crew-driver" className="mb-1 block text-sm font-medium text-slate-700">Driver</label>
            <select id="assign-crew-driver" value={driverId} onChange={(event) => setDriverId(event.target.value)} required disabled={loadingDrivers || Boolean(driversError)} className={selectClass}>
              <option value="">Choose a driver...</option>
              {sortForPicker(drivers).map((person) => (
                <option key={idOf(person)} value={idOf(person)} disabled={!isPickable(person)}>{crewOptionLabel(person)}</option>
              ))}
            </select>
            {loadingDrivers && <p role="status" className="mt-1 text-xs text-slate-500">Checking who is free that day...</p>}
            {driversError && <p role="alert" className="mt-1 text-xs text-rose-700">{driversError}</p>}
          </div>
        )}
        {needChauffeur && (
          <div>
            <label htmlFor="assign-crew-chauffeur" className="mb-1 block text-sm font-medium text-slate-700">Chauffeur</label>
            <select id="assign-crew-chauffeur" value={conductorId} onChange={(event) => setConductorId(event.target.value)} required className={selectClass}>
              <option value="">Choose a Chauffeur...</option>
              {sortForPicker(conductors).map((person) => (
                <option key={idOf(person)} value={idOf(person)} disabled={!isPickable(person)}>{crewOptionLabel(person)}</option>
              ))}
            </select>
          </div>
        )}
        {msg && <p role="alert" className="text-sm text-red-600">{msg}</p>}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving || !ready} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Assign crew
          </button>
        </div>
      </form>
    </Modal>
  );
}
