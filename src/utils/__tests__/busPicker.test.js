import { describe, expect, it } from 'vitest';
import { availabilityTime, busOptionLabel, operatingHoursText, sortBusesForPicker } from '../busPicker';

// 2026-11-21 (user, Dynamic Route Scheduling): the bus list of the scheduling form. SAMPLE buses.
const free = { fleet_id: 1, plate_number: 'BBB-2', bus_label: 'Sample Shuttle / SS-02', available: true, reason_code: null };
const busy = { fleet_id: 2, plate_number: 'AAA-1', bus_label: 'Sample Shuttle / SS-01', available: false, reason_code: 'busy' };
const early = { fleet_id: 3, plate_number: 'CCC-3', available: false, reason_code: 'outside_hours', operating_start_time: '12:00', operating_end_time: '20:00' };

describe('busPicker', () => {
  it('writes a bus\'s operating hours, or Not set', () => {
    expect(operatingHoursText({ operating_start_time: '06:00:00', operating_end_time: '22:00:00' })).toBe('6:00 AM to 10:00 PM');
    expect(operatingHoursText({})).toBe('Not set');
  });

  it('names each bus and says why one is not free', () => {
    expect(busOptionLabel(free)).toBe('BBB-2 · Sample Shuttle / SS-02');
    expect(busOptionLabel(busy)).toBe('AAA-1 · Sample Shuttle / SS-01 - on another trip then');
    expect(busOptionLabel(early)).toBe('CCC-3 - outside its hours (12:00 PM to 8:00 PM)');
    expect(busOptionLabel({ fleet_id: 4, plate_number: 'DDD-4', available: false, reason_code: 'no_fare' })).toBe('DDD-4 - no fare for this route');
  });

  it('lists free buses first, then by plate', () => {
    expect(sortBusesForPicker([early, busy, free]).map((bus) => bus.fleet_id)).toEqual([1, 2, 3]);
    expect(sortBusesForPicker(null)).toEqual([]);
  });

  it('checks a single trip at its departure and a multi-leg schedule at its first leg', () => {
    expect(availabilityTime({ trip_type: 'one_way', departure_time: '08:30' })).toBe('08:30');
    expect(availabilityTime({ trip_type: 'round_trip', leg_departure_times: ['06:00', '09:00'] })).toBe('06:00');
    expect(availabilityTime({ trip_type: 'round_trip' })).toBe('');
  });
});
