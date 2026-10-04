import { isExpress, serviceTypeLabel } from '../../utils/serviceType';

/** Small Regular / Express chip shown on the schedule, the booking flow and the ticket. */
export default function ServiceTypeChip({ serviceType, label, className = '' }) {
  const express = isExpress(serviceType);
  return (
    <span
      data-testid="service-type-chip"
      data-service-type={express ? 'express' : 'regular'}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        express ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-600'
      } ${className}`}
    >
      {label || serviceTypeLabel(serviceType)}
    </span>
  );
}
