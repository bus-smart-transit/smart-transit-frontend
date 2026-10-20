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

/** The card's one line about the crew. The names are in the modal. */
function crewSummary(card) {
  const people = ['driver', 'conductor'].map((role) => card.assignments?.[role]);
  const missing = people.filter((p) => !p || p.needs_replacement).length;
  const assigned = people.length - missing;
  const text = assigned === 0 ? 'No crew assigned' : `${assigned} crew assigned${missing > 0 ? ' · Needs a replacement' : ''}`;
  return { missing, text };
}

/**
 * Batch 30 and 35: one shift block on the Operator's Shift Blocks view. The card is compact; clicking it (or pressing
 * Enter or Space on it) opens ONE modal with the crew, the legs and the block's actions. The status badge is the
 * server's derived status. The assignment indicators in the modal show only while the server says the block can still
 * be answered (`showState`); a finished, cancelled or past-dated block shows its status, or "Overdue - date has
 * passed", and nothing else about the answer.
 */
export default function ShiftBlockCard({ card, showState, audit = null, actions = null }) {
  const [open, setOpen] = useState(false);
  const overdue = card.is_overdue === true || card.section === 'overdue';
  const auditChip = audit && AUDIT_CHIP[audit];
  const crew = crewSummary(card);
  const title = card.route_name || `${card.origin || '-'} → ${card.destination || '-'}`;
  const dateText = formatManilaDate(card.scheduled_date) || card.scheduled_date || '-';

  const onKeyDown = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <>
    <Card
      as="article"
      padding="sm"
      className="cursor-pointer space-y-3 hover:border-teal-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
      data-testid="shift-block-card"
      data-card-key={card.key}
      data-section={card.section}
      role="button"
      tabIndex={0}
      aria-haspopup="dialog"
      aria-label={`${title}, ${dateText}, ${timeRange(card)}. Open crew and legs`}
      onClick={() => setOpen(true)}
      onKeyDown={onKeyDown}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-base font-bold text-slate-900">{title}</h4>
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
          <RunInfoChips runPattern={card.run_pattern} service={card.service} serviceType={card.service_type} showRunPattern showStops />
          {card.plate_number && <span className="font-data">{card.plate_number}</span>}
        </div>
        {overdue && <p data-testid="overdue-note" className="text-xs font-semibold text-amber-700">{OVERDUE_NOTE}</p>}
      </div>

      <p data-testid="crew-summary" className={`text-sm ${crew.missing > 0 ? 'font-semibold text-amber-700' : 'text-slate-600'}`}>
        {crew.text}
      </p>
    </Card>

    {/* A sibling of the card, not a child: a click on the overlay must not reach the card and open the modal again. */}
    <Modal open={open} onClose={() => setOpen(false)} title={title}>
      <div className="space-y-4" data-testid="shift-block-modal">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">{dateText} · {timeRange(card)}</p>
          <span data-testid="modal-status" className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_CLASS[card.status] || STATUS_CLASS.scheduled}`}>{statusLabel(card.status)}</span>
          {auditChip && <span className={`rounded-full px-2 py-1 text-xs font-semibold ${auditChip[1]}`}>{auditChip[0]}</span>}
        </div>
        {overdue && <p className="text-xs font-semibold text-amber-700">{OVERDUE_NOTE}</p>}

        <section aria-label="Crew" className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Crew</h3>
          <ul className="space-y-2" data-testid="assignment-roles">
            {['driver', 'conductor'].map((role) => (
              <StaffRow key={role} role={role} assignment={card.assignments?.[role]} showState={showState} />
            ))}
          </ul>
        </section>

        <section aria-label="Trips in this block" className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{card.legs_count === 1 ? 'Trip' : 'Trips in this block'}</h3>
          <AssignmentLegList card={card} />
        </section>

        {card.reason_text && <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Reason given: {card.reason_text}</p>}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
          {actions && (
            // The modal closes after an action so the message on the page behind it can be read.
            <div className="mr-auto flex flex-wrap items-center gap-2" onClick={(event) => { if (event.target.closest('button')) setOpen(false); }}>
              {actions}
            </div>
          )}
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
        </div>
      </div>
    </Modal>
    </>
  );
}
