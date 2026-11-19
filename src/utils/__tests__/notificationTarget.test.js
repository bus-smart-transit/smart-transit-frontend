import { describe, expect, test } from 'vitest';
import {
  buildBlockAssignmentPath,
  buildTripAssignmentPath,
  describeAssignmentFocus,
  describeBlockFocus,
  isSafeStaffPath,
  readDeepLink,
  resolveNotificationTarget,
} from '../notificationTarget';

const assigned = (data, type = 'trip_assigned') => ({ type, data });

describe('resolveNotificationTarget', () => {
  test('uses the server link for a trip_assigned notification, per role', () => {
    const driver = resolveNotificationTarget(
      assigned({ trip_id: 42, role: 'driver', link: '/employee/driver/dashboard?tab=dashboard&trip=42' }),
      'driver',
    );
    expect(driver).toEqual({ path: '/employee/driver/dashboard?tab=dashboard&trip=42', tab: 'dashboard', tripId: 42 });

    const conductor = resolveNotificationTarget(
      assigned({ trip_id: 7, role: 'conductor', link: '/employee/conductor/dashboard?tab=dashboard&trip=7' }),
      'conductor',
    );
    expect(conductor.path).toBe('/employee/conductor/dashboard?tab=dashboard&trip=7');

    const operator = resolveNotificationTarget(
      assigned({ trip_id: 9, role: 'operator', link: '/employee/operator/dashboard?tab=trips&trip=9' }),
      'operator',
    );
    expect(operator.tab).toBe('trips');
  });

  test('rebuilds the link for an old notification that has none', () => {
    expect(resolveNotificationTarget(assigned({ trip_id: 5 }), 'conductor')).toEqual({
      path: '/employee/conductor/dashboard?tab=dashboard&trip=5',
      tab: 'dashboard',
      tripId: 5,
    });
  });

  test('accepts data stored as a JSON string', () => {
    expect(resolveNotificationTarget(assigned(JSON.stringify({ trip_id: 3 })), 'driver')?.tripId).toBe(3);
  });

  test('ignores an external or malformed link and falls back to the built path', () => {
    const t = resolveNotificationTarget(assigned({ trip_id: 8, link: 'https://evil.example/x' }), 'driver');
    expect(t.path).toBe('/employee/driver/dashboard?tab=dashboard&trip=8');
    expect(resolveNotificationTarget(assigned({ trip_id: 8, link: '//evil.example' }), 'driver').path).toBe(
      '/employee/driver/dashboard?tab=dashboard&trip=8',
    );
  });

  test('never follows a link made for another role', () => {
    expect(resolveNotificationTarget(assigned({ trip_id: 4, role: 'driver' }), 'conductor')).toBeNull();
  });

  test('other notification types are not clickable', () => {
    for (const type of ['trip_cancelled', 'trip_delayed', 'trip_accepted', 'trip_decline_requested', 'payment_confirmed', 'general']) {
      expect(resolveNotificationTarget({ type, data: { trip_id: 1, shift_block_id: 1 } }, 'driver')).toBeNull();
    }
  });

  test('a shift block notification opens the block card, per role, and keeps graceful fallbacks', () => {
    const block = (data) => ({ type: 'shift_block_assigned', data });
    expect(resolveNotificationTarget(block({ shift_block_id: 5, role: 'driver', link: '/employee/driver/dashboard?tab=dashboard&block=5' }), 'driver'))
      .toEqual({ path: '/employee/driver/dashboard?tab=dashboard&block=5', tab: 'dashboard', blockId: 5 });
    // An old notification with no link is rebuilt; an external link is never followed.
    expect(resolveNotificationTarget(block({ shift_block_id: 6 }), 'conductor').path).toBe('/employee/conductor/dashboard?tab=dashboard&block=6');
    expect(resolveNotificationTarget(block({ shift_block_id: 6, link: 'https://evil.example/x' }), 'driver').path).toBe('/employee/driver/dashboard?tab=dashboard&block=6');
    expect(resolveNotificationTarget(block({ shift_block_id: 6, role: 'driver' }), 'conductor')).toBeNull();
    expect(resolveNotificationTarget(block({}), 'driver')).toBeNull();
  });

  test('a dispatch contact notification opens the current trip view for its assigned role', () => {
    expect(resolveNotificationTarget({
      type: 'dispatch_contact',
      data: { type: 'dispatch_contact', trip_id: 42, role: 'driver', link: '/employee/driver/dashboard?tab=activeTrip&trip=42' },
    }, 'driver')).toEqual({ path: '/employee/driver/dashboard?tab=activeTrip&trip=42', tab: 'activeTrip', tripId: 42 });
    expect(resolveNotificationTarget({
      type: 'dispatch_contact',
      data: { type: 'dispatch_contact', trip_id: 12, role: 'conductor', link: '/employee/conductor/dashboard?tab=activeShift&trip=12' },
    }, 'conductor').tab).toBe('activeShift');
    expect(resolveNotificationTarget({ type: 'dispatch_contact', data: { trip_id: 42, role: 'driver' } }, 'conductor')).toBeNull();
  });

  test('returns null without a usable trip id or role', () => {
    expect(resolveNotificationTarget(assigned({}), 'driver')).toBeNull();
    expect(resolveNotificationTarget(assigned({ trip_id: 'abc' }), 'driver')).toBeNull();
    expect(resolveNotificationTarget(assigned({ trip_id: 1 }), 'passenger')).toBeNull();
  });
});

describe('path helpers', () => {
  test('isSafeStaffPath only allows relative staff paths', () => {
    expect(isSafeStaffPath('/employee/driver/dashboard?tab=dashboard&trip=1')).toBe(true);
    for (const bad of ['https://x.example', '//x.example', '/passenger/dashboard', 'javascript:alert(1)', '/employee/\\evil', '', null, undefined]) {
      expect(isSafeStaffPath(bad)).toBe(false);
    }
  });

  test('buildTripAssignmentPath rejects a bad role or id', () => {
    expect(buildTripAssignmentPath('driver', 12)).toBe('/employee/driver/dashboard?tab=dashboard&trip=12');
    expect(buildTripAssignmentPath('operator', 12)).toBe('/employee/operator/dashboard?tab=trips&trip=12');
    expect(buildTripAssignmentPath('passenger', 12)).toBeNull();
    expect(buildTripAssignmentPath('driver', -1)).toBeNull();
  });

  test('readDeepLink reads a valid tab, trip and block, ignores unknown ones', () => {
    expect(readDeepLink('?tab=dashboard&trip=42', 'driver')).toEqual({ tab: 'dashboard', tripId: 42, blockId: null });
    expect(readDeepLink('?tab=dashboard&block=7', 'driver')).toEqual({ tab: 'dashboard', tripId: null, blockId: 7 });
    expect(readDeepLink('?tab=bogus&trip=x&block=-1', 'driver')).toEqual({ tab: null, tripId: null, blockId: null });
    expect(readDeepLink('?tab=occupancy', 'driver')).toEqual({ tab: null, tripId: null, blockId: null });
    expect(readDeepLink('?tab=occupancy&trip=3', 'conductor')).toEqual({ tab: 'occupancy', tripId: 3, blockId: null });
    expect(readDeepLink('', 'driver')).toEqual({ tab: null, tripId: null, blockId: null });
  });

  test('buildBlockAssignmentPath rejects a bad role or id', () => {
    expect(buildBlockAssignmentPath('driver', 12)).toBe('/employee/driver/dashboard?tab=dashboard&block=12');
    expect(buildBlockAssignmentPath('passenger', 12)).toBeNull();
    expect(buildBlockAssignmentPath('driver', 0)).toBeNull();
  });
});

describe('describeAssignmentFocus (the trip changed after the notification)', () => {
  const trip = (over = {}) => ({ trip_id: 10, status: 'scheduled', ...over });

  test('pending assignment prompts a response', () => {
    expect(describeAssignmentFocus([trip()], 10, 'driver').state).toBe('pending');
  });

  test('already accepted', () => {
    expect(describeAssignmentFocus([trip({ driver_accepted_at: '2026-10-04T01:00:00Z' })], 10, 'driver').state).toBe('accepted');
    expect(describeAssignmentFocus([trip({ conductor_accepted_at: '2026-10-04T01:00:00Z' })], 10, 'conductor').state).toBe('accepted');
  });

  test('declined and waiting for approval, or rejected', () => {
    expect(describeAssignmentFocus([trip({ driver_request_status: 'for_approval' })], 10, 'driver').state).toBe('for_approval');
    expect(describeAssignmentFocus([trip({ conductor_request_status: 'rejected' })], 10, 'conductor').state).toBe('rejected');
  });

  test('cancelled and completed trips', () => {
    expect(describeAssignmentFocus([trip({ status: 'cancelled' })], 10, 'driver').state).toBe('cancelled');
    expect(describeAssignmentFocus([trip({ status: 'completed' })], 10, 'driver').state).toBe('completed');
  });

  test('a trip that already left can no longer be answered', () => {
    expect(describeAssignmentFocus([trip({ status: 'departed' })], 10, 'driver').state).toBe('under_way');
  });

  test('a trip missing from the list was reassigned, declined or removed: a clear message, no error', () => {
    const notice = describeAssignmentFocus([trip({ trip_id: 11 })], 10, 'driver');
    expect(notice.state).toBe('unavailable');
    expect(notice.tone).toBe('warning');
    expect(describeAssignmentFocus([], 10, 'driver').state).toBe('unavailable');
    expect(describeAssignmentFocus(undefined, 10, 'driver').state).toBe('unavailable');
  });

  test('no trip id means no notice', () => {
    expect(describeAssignmentFocus([trip()], null, 'driver')).toBeNull();
  });
});

describe('describeBlockFocus (the shift block changed after the notification)', () => {
  const card = (over = {}) => ({ kind: 'block', shift_block_id: 5, status: 'scheduled', assignment_status: 'pending', can_respond: true, ...over });

  test('a pending block prompts one response for the whole block', () => {
    const notice = describeBlockFocus([card()], 5);
    expect(notice.state).toBe('pending');
    expect(notice.message).toMatch(/whole block/i);
  });

  test('says what became of the block', () => {
    expect(describeBlockFocus([card({ assignment_status: 'for_approval' })], 5).state).toBe('for_approval');
    expect(describeBlockFocus([card({ assignment_status: 'rejected' })], 5).state).toBe('rejected');
    expect(describeBlockFocus([card({ assignment_status: 'accepted' })], 5).state).toBe('accepted');
    expect(describeBlockFocus([card({ status: 'cancelled' })], 5).state).toBe('cancelled');
    expect(describeBlockFocus([card({ status: 'completed' })], 5).state).toBe('completed');
    expect(describeBlockFocus([card({ can_respond: false })], 5).state).toBe('under_way');
  });

  test('a block that is no longer on the list (declined and approved, reassigned) gives a calm message', () => {
    const notice = describeBlockFocus([card({ shift_block_id: 9 })], 5);
    expect(notice.state).toBe('unavailable');
    expect(notice.tone).toBe('warning');
    expect(describeBlockFocus([], 5).state).toBe('unavailable');
    expect(describeBlockFocus([card({ kind: 'trip', shift_block_id: null })], 5).state).toBe('unavailable');
  });

  test('no block id means no notice', () => {
    expect(describeBlockFocus([card()], null)).toBeNull();
  });
});
test('§4.12: a Driver link to Earnings opens the Dashboard instead', () => {
  expect(readDeepLink('?tab=earnings', 'driver').tab).toBeNull();
  expect(readDeepLink('?tab=schedule', 'driver').tab).toBe('schedule');
});
