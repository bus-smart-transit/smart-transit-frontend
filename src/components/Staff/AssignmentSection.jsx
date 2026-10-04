import AssignmentBlockCards from './AssignmentBlockCards';
import DeclineTripModal from './DeclineTripModal';
import TripFocusNotice from './TripFocusNotice';
import { describeAssignmentFocus, describeBlockFocus } from '../../utils/notificationTarget';
import { getBusinessToday, formatManilaDate } from '../../utils/dates';
import { sectionCards } from '../../utils/assignmentCards';

/**
 * The "Assigned Routes" body of the Driver and Chauffeur dashboards (Batch 28, item 1): the focus
 * notice from a notification, today's and upcoming block cards, and the decline dialog. Accept and
 * Decline are answered once per block here; the server writes the block and its legs together.
 */
export default function AssignmentSection({ role, assignments, assignedTrips, filter = 'all', focusTripId, focusBlockId, onDismissFocus }) {
  const today = getBusinessToday();
  const { cards, loaded } = assignments;

  const focusCard = cards.find((c) => (
    (focusBlockId && c.kind === 'block' && Number(c.shift_block_id) === Number(focusBlockId))
    || (focusTripId && c.legs?.some((leg) => Number(leg.trip_id) === Number(focusTripId)))
  )) || null;
  const focusKey = focusCard?.key ?? null;

  let notice = null;
  if (loaded) {
    if (focusBlockId) notice = describeBlockFocus(cards, focusBlockId);
    else if (focusCard?.kind === 'block') notice = describeBlockFocus(cards, focusCard.shift_block_id);
    else if (focusTripId) notice = describeAssignmentFocus(assignedTrips, focusTripId, role);
  }

  const { today: todayCards, upcoming } = sectionCards(cards, filter, today);
  const declining = assignments.confirmDecline;

  return (
    <>
      <TripFocusNotice tripId={null} notice={notice} onDismiss={onDismissFocus} className="mb-4" />
      {assignments.message && <p role="status" className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{assignments.message}</p>}
      {assignments.error && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{assignments.error}</p>}
      {!loaded ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">Loading your assignments...</div>
      ) : (
        <div className="space-y-5">
          <AssignmentBlockCards
            title={filter === 'completed' ? 'Completed' : "Today's Assignments"}
            cards={todayCards}
            focusKey={focusKey}
            busyKey={assignments.busyKey}
            onAccept={assignments.accept}
            onDecline={assignments.setConfirmDecline}
            emptyMessage="Nothing assigned for today."
          />
          {filter !== 'completed' && (
            <AssignmentBlockCards
              title="Upcoming Assignments"
              cards={upcoming}
              focusKey={focusKey}
              busyKey={assignments.busyKey}
              onAccept={assignments.accept}
              onDecline={assignments.setConfirmDecline}
              emptyMessage="No upcoming assignments."
            />
          )}
        </div>
      )}

      {declining && (
        <DeclineTripModal
          key={declining.key}
          trip={{ fleet_route: { route: { origin: declining.origin, destination: declining.destination } } }}
          scheduleLabel={`${formatManilaDate(declining.scheduled_date) || declining.scheduled_date} · ${declining.legs_count} ${declining.legs_count === 1 ? 'leg' : 'legs'}`}
          submitting={assignments.declineSubmitting}
          errors={assignments.declineErrors}
          onCancel={assignments.cancelDecline}
          onSubmit={assignments.submitDecline}
        />
      )}
    </>
  );
}
