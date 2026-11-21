import { describe, expect, it } from 'vitest';
import { busCardView, minutesText, minutesUntilClock } from '../busCard';

// 2026-11-21 (user): the bus card on Track Bus. SAMPLE places and times.
const NOW = Date.parse('2026-11-21T08:50:00+08:00'); // 08:50 in Manila

const running = {
  fleet_id: 4, route_id: 3, route_name: 'Sample Terminal to East Town', bus_company: 'Sample Shuttle', bus_body_no: 'SS-04',
  bus_label: 'Sample Shuttle / SS-04', fleet_type: 'public', vehicle_class_label: 'Aircon', trip_status: 'departed',
  trip_progress: { service: { type: 'express', label: 'Express', non_stop: true }, full: false, next_stop: 'Bravo' },
};

describe('minutesUntilClock and minutesText', () => {
  it('counts the minutes to a Manila clock time today', () => {
    expect(minutesUntilClock('09:00', NOW)).toBe(10);
    expect(minutesUntilClock('08:30', NOW)).toBe(0);
    expect(minutesUntilClock(null, NOW)).toBeNull();
  });

  it('says In ~n min, Due now, or nothing', () => {
    expect(minutesText(2)).toBe('In ~2 min');
    expect(minutesText(0)).toBe('Due now');
    expect(minutesText(null)).toBeNull();
  });
});

describe('busCardView', () => {
  it('shows the company and body number, the type, and chips for the service and class', () => {
    const view = busCardView(running, { place: 'Near Bravo', nowMs: NOW });
    expect(view).toMatchObject({ title: 'Sample Shuttle', bodyNo: 'SS-04', type: 'Public', place: 'Near Bravo', routeId: 3 });
    expect(view.chips.map((chip) => chip.label)).toEqual(['Express · Non-stop', 'Aircon']);
  });

  it('gives the next stop with its time and minutes from the timeline', () => {
    const eta = { next: { name: 'Bravo', time: '9:00 AM', minutes: 2, live: true }, destination: { name: 'East Town' }, finished: false };
    expect(busCardView(running, { eta, nowMs: NOW }).next).toEqual({ label: 'Next stop', place: 'Bravo', time: '9:00 AM', minutes: 'In ~2 min', live: true });
  });

  it('gives when a waiting bus leaves and the minutes to it', () => {
    const waiting = { ...running, waiting: true, waiting_at: 'Sample Terminal', departs_at: '09:00', trip_progress: null };
    expect(busCardView(waiting, { nowMs: NOW }).next).toEqual({ label: 'Leaves', place: 'Sample Terminal', time: '9:00 AM', minutes: 'In ~10 min', live: false });
  });

  it('says when the bus has arrived, and marks a delayed, full or simulated bus', () => {
    const bus = { ...running, trip_status: 'delayed', is_simulated: true, trip_progress: { ...running.trip_progress, full: true, arrived: true, destination: 'East Town' } };
    const view = busCardView(bus, { nowMs: NOW });
    expect(view.next).toMatchObject({ label: 'Arrived', place: 'East Town' });
    expect(view.chips.map((chip) => chip.label)).toEqual(['Express · Non-stop', 'Aircon', 'Delayed', 'Full', 'Simulated']);
  });

  it('never makes up a value: no next stop reads Not provided, and no type or class is left out', () => {
    const bare = { fleet_id: 9, bus_label: 'Sample Shuttle / SS-09', trip_progress: null };
    const view = busCardView(bare, { nowMs: NOW });
    expect(view).toMatchObject({ title: 'Sample Shuttle / SS-09', bodyNo: null, type: null, routeId: null, chips: [] });
    expect(view.next.place).toBe('Not provided');
    expect(busCardView(null)).toBeNull();
  });
});
