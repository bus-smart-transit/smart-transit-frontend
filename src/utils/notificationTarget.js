// Batch 27, Task 1: where a notification click should take the user.
//
// The server builds a relative `link` and puts it, with `type`, `trip_id` and
// `role`, in the notification data (backend: App\Support\Notifications\
// NotificationLink). This file turns a notification into a target for the
// in-app list, and decides what to tell the user when the trip has changed
// since the notification was sent.
//
// Batch 27: "trip_assigned" is clickable. Batch 28: so is "shift_block_assigned", which opens the block's card.
// Other non-actionable types return null so nothing changes for them.

import { canRespondToAssignment, getAssignmentRequestStatus } from './assignmentRequest';

export const STAFF_ROLES = ['driver', 'conductor', 'operator'];

// Tabs a deep link may open, per role (must match each dashboard's nav keys).
const VALID_TABS = {
  driver: ['dashboard', 'activeTrip', 'schedule', 'earnings', 'pin', 'account'],
  conductor: ['dashboard', 'occupancy', 'activeShift', 'schedule', 'pin', 'account'],
  operator: ['dashboard', 'staffs', 'fleets', 'routes', 'trips', 'calendar', 'shiftBlocks', 'reports', 'account'],
};

const DEFAULT_TAB = { driver: 'dashboard', conductor: 'dashboard', operator: 'trips' };

export const CLICKABLE_NOTIFICATION_TYPES = ['trip_assigned', 'shift_block_assigned', 'dispatch_contact'];

/** A same-site staff path only: never an external URL or a protocol-relative one. */
export function isSafeStaffPath(path) {
  return (
    typeof path === 'string' &&
    path.startsWith('/employee/') &&
    !path.startsWith('//') &&
    !/[\s\\]/.test(path) &&
    !/^[a-z][a-z0-9+.-]*:/i.test(path)
  );
}

export function buildTripAssignmentPath(role, tripId) {
  const safeRole = STAFF_ROLES.includes(role) ? role : null;
  const id = Number(tripId);
  if (!safeRole || !Number.isInteger(id) || id <= 0) return null;
  return `/employee/${safeRole}/dashboard?tab=${DEFAULT_TAB[safeRole]}&trip=${id}`;
}

/** The card of a shift block on the Driver / Chauffeur dashboard (Batch 28). */
export function buildBlockAssignmentPath(role, blockId) {
  const safeRole = STAFF_ROLES.includes(role) ? role : null;
  const id = Number(blockId);
  if (!safeRole || !Number.isInteger(id) || id <= 0) return null;
  return `/employee/${safeRole}/dashboard?tab=${DEFAULT_TAB[safeRole]}&block=${id}`;
}

function parseData(notification) {
  const raw = notification?.data;
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * @param {object} notification a user_notifications row ({ type, data })
 * @param {'driver'|'conductor'|'operator'} role the signed-in role
 * @returns {{ path: string, tab: string, tripId?: number, blockId?: number } | null}
 */
export function resolveNotificationTarget(notification, role) {
  if (!STAFF_ROLES.includes(role)) return null;
  const data = parseData(notification);
  const type = String(notification?.type ?? data.type ?? '');
  if (!CLICKABLE_NOTIFICATION_TYPES.includes(type)) return null;

  const isBlock = type === 'shift_block_assigned';
  const id = Number(isBlock ? data.shift_block_id : data.trip_id);
  if (!Number.isInteger(id) || id <= 0) return null;

  // Old notifications (sent before the link existed) carry no link: rebuild it.
  // A link that was made for another role is never followed.
  const linkedRole = typeof data.role === 'string' && STAFF_ROLES.includes(data.role) ? data.role : role;
  if (linkedRole !== role) return null;

  const rebuilt = isBlock ? buildBlockAssignmentPath(role, id) : buildTripAssignmentPath(role, id);
  const path = isSafeStaffPath(data.link) ? data.link : rebuilt;
  if (!path) return null;

  const tab = new URLSearchParams(path.split('?')[1] || '').get('tab');
  const safeTab = VALID_TABS[role].includes(tab) ? tab : DEFAULT_TAB[role];
  return isBlock ? { path, tab: safeTab, blockId: id } : { path, tab: safeTab, tripId: id };
}

/** Reads ?tab=, ?trip= and ?block= from a location.search string for the first render. */
export function readDeepLink(search, role) {
  let params;
  try {
    params = new URLSearchParams(search || '');
  } catch {
    return { tab: null, tripId: null, blockId: null };
  }
  const tab = params.get('tab');
  const trip = Number(params.get('trip'));
  const block = Number(params.get('block'));
  return {
    tab: STAFF_ROLES.includes(role) && VALID_TABS[role].includes(tab) ? tab : null,
    tripId: Number.isInteger(trip) && trip > 0 ? trip : null,
    blockId: Number.isInteger(block) && block > 0 ? block : null,
  };
}

const stateOf = (v) => String(v ?? '').toLowerCase();

/**
 * What to tell the user about the trip a notification pointed at.
 * `trips` is the signed-in person's own assigned-trips list (the server only
 * returns trips assigned to them), so a trip missing from it is no longer
 * theirs: declined, reassigned or removed.
 *
 * @returns {{ state: string, tone: 'info'|'success'|'warning', title: string, message: string } | null}
 */
export function describeAssignmentFocus(trips, tripId, role) {
  if (!tripId) return null;
  const list = Array.isArray(trips) ? trips : [];
  const trip = list.find((t) => Number(t?.trip_id) === Number(tripId));

  if (!trip) {
    return {
      state: 'unavailable',
      tone: 'warning',
      title: `Trip #${tripId} is no longer on your list`,
      message: 'It was declined, reassigned to someone else, or removed. Nothing is needed from you.',
    };
  }

  const status = stateOf(trip.status);
  if (status === 'cancelled') {
    return { state: 'cancelled', tone: 'warning', title: `Trip #${tripId} was cancelled`, message: 'This trip will not run. Nothing is needed from you.' };
  }
  if (status === 'completed') {
    return { state: 'completed', tone: 'info', title: `Trip #${tripId} is already completed`, message: 'This trip has finished.' };
  }

  const acceptedAt = role === 'conductor' ? trip.conductor_accepted_at : trip.driver_accepted_at;
  const requestStatus = getAssignmentRequestStatus(trip, role);
  if (requestStatus === 'for_approval') {
    return {
      state: 'for_approval',
      tone: 'info',
      title: `Trip #${tripId} is waiting for approval`,
      message: 'You asked to be released from this trip. The operator has not decided yet.',
    };
  }
  if (requestStatus === 'rejected') {
    return {
      state: 'rejected',
      tone: 'info',
      title: `You are still assigned to trip #${tripId}`,
      message: 'The operator did not approve your request to be released.',
    };
  }
  if (acceptedAt) {
    return { state: 'accepted', tone: 'success', title: `You already accepted trip #${tripId}`, message: 'No further response is needed.' };
  }
  if (!canRespondToAssignment(trip, role)) {
    return { state: 'under_way', tone: 'info', title: `Trip #${tripId} is already under way`, message: 'It can no longer be accepted or declined.' };
  }

  return {
    state: 'pending',
    tone: 'info',
    title: `New assignment: trip #${tripId}`,
    message: 'Review it below, then Accept or Decline.',
  };
}

/**
 * Batch 28: what to tell the user about the shift block a notification pointed at. `cards` is the
 * signed-in person's own block cards (the server only returns blocks assigned to them), so a block
 * missing from it is no longer theirs: declined and approved, reassigned or removed.
 *
 * @returns {{ state: string, tone: 'info'|'success'|'warning', title: string, message: string } | null}
 */
export function describeBlockFocus(cards, blockId) {
  if (!blockId) return null;
  const list = Array.isArray(cards) ? cards : [];
  const card = list.find((c) => c?.kind === 'block' && Number(c?.shift_block_id) === Number(blockId));
  const label = `Shift block #${blockId}`;

  if (!card) {
    return {
      state: 'unavailable',
      tone: 'warning',
      title: `${label} is no longer on your list`,
      message: 'It was declined, reassigned to someone else, or removed. Nothing is needed from you.',
    };
  }

  const status = stateOf(card.status);
  if (status === 'cancelled') {
    return { state: 'cancelled', tone: 'warning', title: `${label} was cancelled`, message: 'This block will not run. Nothing is needed from you.' };
  }
  if (status === 'completed') {
    return { state: 'completed', tone: 'info', title: `${label} is already completed`, message: 'This block has finished.' };
  }
  if (card.assignment_status === 'for_approval') {
    return { state: 'for_approval', tone: 'info', title: `${label} is waiting for approval`, message: 'You asked to be released from this block. The operator has not decided yet.' };
  }
  if (card.assignment_status === 'rejected') {
    return { state: 'rejected', tone: 'info', title: `You are still assigned to ${label}`, message: 'The operator did not approve your request to be released.' };
  }
  if (card.assignment_status === 'accepted') {
    return { state: 'accepted', tone: 'success', title: `You already accepted ${label}`, message: 'No further response is needed.' };
  }
  if (!card.can_respond) {
    return { state: 'under_way', tone: 'info', title: `${label} is already under way`, message: 'It can no longer be accepted or declined.' };
  }

  return { state: 'pending', tone: 'info', title: `New assignment: ${label}`, message: 'Review its legs below, then Accept or Decline the whole block.' };
}
