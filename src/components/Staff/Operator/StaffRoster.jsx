import { Bus, Ticket, UserCheck } from 'lucide-react';
import { OpStat } from './OperatorUI';

/**
 * 2026-10-27: the roster counts at the top of the Staffs page: how many Drivers and Chauffeurs this Operator has, and
 * the buses they run. Batch 46: the counts come from the server for the whole roster, never one page of the list.
 */
export default function StaffRoster({ drivers, conductors, fleets }) {
  const count = (value) => (Array.isArray(value) ? value.length : Number(value) || 0);
  return (
    <section aria-label="Roster" className="grid grid-cols-3 gap-3 sm:gap-4 max-sm:[&_.op-stat-icon]:hidden" data-testid="staff-roster">
      <OpStat icon={UserCheck} accent="blue" label="Drivers" value={count(drivers)} />
      <OpStat icon={Ticket} accent="orange" label="Chauffeurs" value={count(conductors)} />
      <OpStat icon={Bus} accent="green" label="Fleets" value={count(fleets)} />
    </section>
  );
}
