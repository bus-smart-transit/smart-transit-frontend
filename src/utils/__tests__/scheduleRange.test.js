import { describe, expect, test } from 'vitest';
import { formatRangeDay, isRangeSchedule, rangeDayCount, rangeKey, rangePayload, scheduleButtonLabel } from '../scheduleRange';

const form = {
  trip_type: 'round_trip', fleet_route_id: '4', driver_id: '7', conductor_id: '9', block_type: 'morning',
  trip_date: '2026-10-07', to_date: '2026-10-11', service_type: 'regular', leg_departure_times: ['08:00', '11:00'],
};

describe('rangeDayCount', () => {
  test('counts both ends, across a month end', () => {
    expect(rangeDayCount('2026-10-07', '2026-10-11')).toBe(5);
    expect(rangeDayCount('2026-10-07', '2026-10-07')).toBe(1);
    expect(rangeDayCount('2026-10-28', '2026-11-03')).toBe(7);
  });

  test('is 0 when a date is missing or To is before From', () => {
    expect(rangeDayCount('2026-10-07', '')).toBe(0);
    expect(rangeDayCount('', '2026-10-07')).toBe(0);
    expect(rangeDayCount('2026-10-09', '2026-10-07')).toBe(0);
  });
});

describe('isRangeSchedule', () => {
  test('only a multi-leg schedule over more than one day', () => {
    expect(isRangeSchedule(form)).toBe(true);
    expect(isRangeSchedule({ ...form, to_date: '2026-10-07' })).toBe(false); // one day: the single-block form
    expect(isRangeSchedule({ ...form, to_date: '' })).toBe(false);
    expect(isRangeSchedule({ ...form, trip_type: 'one_way' })).toBe(false);
  });
});

describe('rangePayload and rangeKey', () => {
  test('sends From as from_date and the ids as numbers', () => {
    expect(rangePayload(form)).toEqual({
      fleet_route_id: 4, driver_id: 7, conductor_id: 9, block_type: 'morning', from_date: '2026-10-07', to_date: '2026-10-11',
      service_type: 'regular', leg_departure_times: ['08:00', '11:00'],
    });
  });

  test('changes when anything that was previewed changes', () => {
    expect(rangeKey(form)).toBe(rangeKey({ ...form }));
    expect(rangeKey({ ...form, to_date: '2026-10-12' })).not.toBe(rangeKey(form));
    expect(rangeKey({ ...form, driver_id: '8' })).not.toBe(rangeKey(form));
    expect(rangeKey({ ...form, leg_departure_times: ['08:00', '12:00'] })).not.toBe(rangeKey(form));
  });
});

test('formatRangeDay reads the calendar day without a timezone shift', () => {
  expect(formatRangeDay('2026-10-07')).toBe('Wed, Oct 7');
});

test('scheduleButtonLabel', () => {
  expect(scheduleButtonLabel(1)).toBe('Schedule 1 day');
  expect(scheduleButtonLabel(4)).toBe('Schedule 4 days');
});
