import { useState } from 'react';
import Card from '../../ui/Card';
import Modal from '../../ui/Modal';
import RunInfoChips from '../../ui/RunInfoChips';
import AssignmentLegList from '../AssignmentLegList';
import { FOR_APPROVAL_LABEL } from '../../../utils/assignmentRequest';
import { STATUS_CLASS, statusLabel, timeRange } from '../../../utils/assignmentCardView';
import { roleLabel } from '../../../utils/shiftBlockView';
import { formatManilaDate } from '../../../utils/dates';

const OVERDUE_NOTE = 'Overdue - date has passed';

// The small indicator beside a person: shown only while the block can still be answered.
const INDICATOR = {
  pending: { label: 'Awaiting response', dot: 'bg-sky-500', text: 'text-sky-700' },
  accepted: { label: 'Accepted', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  for_approval: { label: FOR_APPROVAL_LABEL, dot: 'bg-amber-500', text: 'text-amber-700' },
  rejected: { label: 'Request rejected', dot: 'bg-slate-400', text: 'text-slate-600' },
};

const AUDIT_CHIP = {
  pending_review: ['Pending review', 'bg-amber-100 text-amber-700'],
  reviewed: ['Reviewed', 'bg-emerald-100 text-emerald-700'],
};

/** One line per person: name, role and (while answerable) a small state indicator. */
function StaffRow({ role, assignment, showState }) {
  const needsReplacement = Boolean(assignment?.needs_replacement);
  const indicator = showState && !needsReplacement ? INDICATOR[assignment?.status] : null;
  return (
    <li className="flex min-w-0 items-center gap-2 text-sm" data-testid="staff-row" data-role={role}>
      <span className={`min-w-0 truncate font-medium ${needsReplacement ? 'text-amber-700' : 'text-slate-900'}`}>
        {needsReplacement ? 'Needs a replacement' : (assignment?.name || '-')}
      </span>
      <span className="shrink-0 text-xs text-slate-500">{roleLabel(role)}</span>
      {indicator && (
        <span
          data-testid="assignment-indicator"
          data-state={assignment.status}
          title={indicator.label}
          className={`ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-semibold ${indicator.text}`}
        >
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${indicator.dot}`} />
          {indicator.label}
        </span>
      )}
    </li>
  );
}

/**
 * Batch 30: one shift block on the Operator's Shift Blocks view. The status badge is the server's derived status. The
 * assignment indicators show only while the server says the block can still be answered (`showState`); a finished,
 * cancelled or past-dated block shows its status, or "Overdue - date has passed", and nothing else about the answer.
 */
export default function ShiftBlockCard({ card, showState, audit = null, actions = null }) {
  const [legsOpen, setLegsOpen] = useState(false);
  const overdue = card.is_overdue === true || card.section === 'overdue';
  const auditChip = audit && AUDIT_CHIP[audit];

  return (
    <Card as="article" padding="sm" className="space-y-3" data-testid="shift-block-card" data-card-key={card.key} data-section={card.section}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-base font-bold text-slate-900">{card.route_name || `${card.origin || '-'} → ${card.destination || '-'}`}</h4>
          <p className="text-sm text-slate-600">{card.origin || '-'} → {card.destination || '-'}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          {auditChip && <span data-testid="audit-chip" className={`rounded-full px-2 py-1 text-xs font-semibold ${auditChip[1]}`}>{auditChip[0]}</span>}
          <span data-testid="card-status" className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_CLASS[card.status] || STATUS_CLASS.scheduled}`}>{statusLabel(card.status)}</span>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-800">{formatManilaDate(card.scheduled_date) || card.scheduled_date || '-'} · {timeRange(card)}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span data-testid="shift-block-legs-count" className="rounded-full bg-slate-100 px-2 py-1 font-semibold">{card.legs_count} {card.legs_count === 1 ? 'leg' : 'legs'}</span>
          <RunInfoChips runPattern={card.run_pattern} service={card.service} serviceType={card.service_type} showStops />
          {card.plate_number && <span className="font-data">{card.plate_number}</span>}
        </div>
        {overdue && <p data-testid="overdue-note" className="text-xs font-semibold text-amber-700">{OVERDUE_NOTE}</p>}
      </div>

      <ul className="space-y-1" data-testid="assignment-roles">
        {['driver', 'conductor'].map((role) => (
          <StaffRow key={role} role={role} assignment={card.assignments?.[role]} showState={showState} />
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => setLegsOpen(true)}
        >
          {card.legs_count === 1 ? 'Details' : 'View legs'}
        </button>
        {actions}
      </div>

      <Modal open={legsOpen} onClose={() => setLegsOpen(false)} title={card.kind === 'block' ? `Shift block #${card.shift_block_id}` : `Trip #${card.trip_id}`}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {card.route_name} · {formatManilaDate(card.scheduled_date) || card.scheduled_date} · {timeRange(card)}
          </p>
          <AssignmentLegList card={card} />
          {card.reason_text && <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Reason given: {card.reason_text}</p>}
        </div>
      </Modal>
    </Card>
  );
}
