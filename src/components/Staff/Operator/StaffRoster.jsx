import { OpStat } from './OperatorUI';

/**
 * 2026-10-27: the roster counts at the top of the Staffs page (moved there from the Operator Dashboard): how many
 * Drivers and Chauffeurs this Operator has, and the buses they run.
 */
export default function StaffRoster({ drivers, conductors, fleets }) {
  return (
    <section aria-label="Roster" className="grid grid-cols-3 gap-4" data-testid="staff-roster">
      <OpStat label="Drivers" value={drivers.length} />
      <OpStat label="Chauffeurs" value={conductors.length} />
      <OpStat label="Fleets" value={fleets.length} />
    </section>
  );
}
