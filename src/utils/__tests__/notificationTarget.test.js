import { describe, expect, test } from 'vitest';
import {
  buildTripAssignmentPath,
  describeAssignmentFocus,
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

  test('other notification types are not clickable in this batch', () => {
    for (const type of ['trip_cancelled', 'trip_delayed', 'trip_accepted', 'trip_decline_requested', 'shift_block_assigned', 'payment_confirmed', 'general']) {
      expect(resolveNotificationTarget({ type, data: { trip_id: 1 } }, 'driver')).toBeNull();
    }
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

  test('readDeepLink reads a valid tab and trip, ignores unknown ones', () => {
    expect(readDeepLink('?tab=dashboard&trip=42', 'driver')).toEqual({ tab: 'dashboard', tripId: 42 });
    expect(readDeepLink('?tab=bogus&trip=x', 'driver')).toEqual({ tab: null, tripId: null });
    expect(readDeepLink('?tab=occupancy', 'driver')).toEqual({ tab: null, tripId: null });
    expect(readDeepLink('?tab=occupancy&trip=3', 'conductor')).toEqual({ tab: 'occupancy', tripId: 3 });
    expect(readDeepLink('', 'driver')).toEqual({ tab: null, tripId: null });
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
