import ServiceTypeChip from '../ui/ServiceTypeChip';
import { STATUS_CLASS, statusLabel } from '../../utils/assignmentCardView';

/** Everything the "View legs" modal shows for one card's legs. Plain text only: React escapes it. */
export default function AssignmentLegList({ card }) {
  return (
    <ol className="space-y-2" data-testid="assignment-legs">
      {card.legs.map((leg, index) => (
        <li key={leg.trip_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">
              {card.legs.length > 1 ? `Leg ${index + 1}: ` : ''}{leg.origin || '-'} → {leg.destination || '-'}
            </p>
            <p className="text-xs text-slate-500">{leg.leg_direction === 'reverse' ? 'Return' : 'Outbound'} · Departs {leg.departure_time || '-'}</p>
          </div>
          <div className="flex items-center gap-2">
            <ServiceTypeChip serviceType={leg.service_type} />
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[leg.status] || STATUS_CLASS.scheduled}`}>{statusLabel(leg.status)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
