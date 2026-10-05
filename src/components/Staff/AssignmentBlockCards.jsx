import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import RunInfoChips from '../ui/RunInfoChips';
import AssignmentLegList from './AssignmentLegList';
import { FOR_APPROVAL_LABEL } from '../../utils/assignmentRequest';
import { STATUS_CLASS, statusLabel as label, timeRange } from '../../utils/assignmentCardView';
import { formatManilaDate } from '../../utils/dates';

/** The assignment-level badge: "For Approval" stays the assignment's status, not the block's. */
function AssignmentBadge({ status, answerable = true, className = '' }) {
  if (status === 'for_approval') {
    return <span data-testid="assignment-badge" data-state="for_approval" className={`rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ${className}`}>{FOR_APPROVAL_LABEL}</span>;
  }
  if (status === 'rejected') {
    return <span data-testid="assignment-badge" data-state="rejected" className={`rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ${className}`}>Request rejected: please proceed</span>;
  }
  if (status === 'accepted') {
    return <span data-testid="assignment-badge" data-state="accepted" className={`rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ${className}`}>Accepted</span>;
  }
  if (status === 'pending') {
    // A card that cannot be answered (date passed, already started) must not say "Awaiting your response":
    // the reason line under it says why.
    if (!answerable) return null;
    return <span data-testid="assignment-badge" data-state="pending" className={`rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ${className}`}>Awaiting your response</span>;
  }
  return null;
}

/**
 * Batch 28, item 1: one card per shift block (route, date, time range, number of legs, status).
 * A one-way or ad hoc trip is a block of one leg: the same card. Accept and Decline appear once,
 * here, for the whole block; the legs are only listed in the modal. The "For Approval" badge is the
 * assignment's status. Batch 30: this is the Driver / Chauffeur card; the Operator's cards live in
 * Schedule/ShiftBlockCard.jsx.
 */
export default function AssignmentBlockCards({
  title,
  cards,
  tone = 'neutral',
  focusKey = null,
  busyKey = null,
  onAccept,
  onDecline,
  emptyMessage = 'No assignments in this section.',
}) {
  const [openKey, setOpenKey] = useState(null);
  const openCard = cards.find((c) => c.key === openKey) || null;

  useEffect(() => {
    if (!focusKey) return;
    const el = document.getElementById(`assignment-${focusKey}`);
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focusKey, cards.length]);

  return (
    <div className={`rounded-xl border p-4 ${tone === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`} data-testid="assignment-section" data-tone={tone}>
      {title && <h5 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h5>}
      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">{emptyMessage}</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {cards.map((card) => {
            const busy = busyKey === card.key;
            return (
              <article
                key={card.key}
                id={`assignment-${card.key}`}
                data-testid="assignment-card"
                data-card-key={card.key}
                data-kind={card.kind}
                className={`rounded-xl border bg-white p-4 shadow-sm ${focusKey === card.key ? 'border-teal-400 ring-2 ring-teal-300' : 'border-slate-200'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h6 className="truncate text-base font-bold text-slate-900">{card.route_name || `${card.origin || '-'} → ${card.destination || '-'}`}</h6>
                    <p className="text-sm text-slate-600">{card.origin || '-'} → {card.destination || '-'}</p>
                  </div>
                  {/* An unfinished card from an earlier day is "Overdue", never "Scheduled". */}
                  <span data-testid="card-status" className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[card.is_overdue ? 'overdue' : card.status] || STATUS_CLASS.scheduled}`}>{card.is_overdue ? 'OVERDUE' : label(card.status)}</span>
                </div>

                <p className="mt-2 text-sm font-semibold text-slate-800">{formatManilaDate(card.scheduled_date) || card.scheduled_date || '-'}</p>
                <p className="text-sm text-slate-600">{timeRange(card)}</p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span data-testid="assignment-legs-count" className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">{card.legs_count} {card.legs_count === 1 ? 'leg' : 'legs'}</span>
                  <RunInfoChips runPattern={card.run_pattern} service={card.service} serviceType={card.service_type} showStops />
                  {card.plate_number && <span className="font-data">{card.plate_number}</span>}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <AssignmentBadge status={card.assignment_status} answerable={card.can_respond !== false} />
                </div>

                {(card.overdue_reason || card.respond_blocked_reason) && (
                  <p data-testid="card-reason" className="mt-2 text-xs text-amber-700">{card.overdue_reason || card.respond_blocked_reason}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => setOpenKey(card.key)}
                  >
                    {card.legs_count === 1 ? 'Details' : 'View legs'}
                  </button>
                  {card.can_respond && (
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                      onClick={() => onAccept?.(card)}
                    >
                      {busy ? 'Accepting...' : 'Accept'}
                    </button>
                  )}
                  {card.can_decline && (
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                      onClick={() => onDecline?.(card)}
                    >
                      Decline
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={Boolean(openCard)} onClose={() => setOpenKey(null)} title={openCard ? (openCard.kind === 'block' ? `Shift block #${openCard.shift_block_id}` : `Trip #${openCard.trip_id}`) : ''}>
        {openCard && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              {openCard.route_name} · {formatManilaDate(openCard.scheduled_date) || openCard.scheduled_date} · {timeRange(openCard)}
            </p>
            <AssignmentLegList card={openCard} />
            {openCard.reason_text && <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Reason given: {openCard.reason_text}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
