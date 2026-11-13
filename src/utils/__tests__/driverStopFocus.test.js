import { describe, expect, it } from 'vitest';
import { driverStopFocus, stopLabel } from '../driverStopFocus';

// 2026-11-13 (user): the Driver's Trip page shows one stop at a time.
const stops = (acked = 0) => ['Ecoland Terminal', 'Buhangin', 'Panacan', 'Tagum Terminal'].map((stop_name, i) => ({
  stop_id: i + 1, stop_name, sequence_number: i + 1, is_acknowledged: i < acked,
}));

describe('driverStopFocus', () => {
  it('shows the starting terminal before the bus leaves (scheduled, delayed, boarding)', () => {
    for (const tripStatus of ['scheduled', 'delayed', 'boarding']) {
      const focus = driverStopFocus({ stops: stops(), tripStatus });
      expect(focus.phase).toBe('start');
      expect(focus.stop.stop_name).toBe('Ecoland Terminal');
      expect(focus.following.stop_name).toBe('Buhangin');
    }
  });

  it('on the road shows the first stop not reached after the terminal, even when the terminal was not tapped', () => {
    expect(driverStopFocus({ stops: stops(0), tripStatus: 'departed' }).stop.stop_name).toBe('Buhangin');
    expect(driverStopFocus({ stops: stops(1), tripStatus: 'departed' }).stop.stop_name).toBe('Buhangin');
    const focus = driverStopFocus({ stops: stops(2), tripStatus: 'in-progress' });
    expect(focus.phase).toBe('onRoad');
    expect(focus.stop.stop_name).toBe('Panacan');
    expect(focus.index).toBe(2);
    expect(focus.previousSeq).toBe(2);
  });

  it('stays on the last stop with End Trip once it is reached', () => {
    const focus = driverStopFocus({ stops: stops(4), tripStatus: 'departed' });
    expect(focus.phase).toBe('end');
    expect(focus.stop.stop_name).toBe('Tagum Terminal');
    expect(focus.following).toBeNull();
  });

  it('has nothing to show without stops, and nothing to press once the trip is finished', () => {
    expect(driverStopFocus({ stops: [], tripStatus: 'departed' }).phase).toBe('none');
    expect(driverStopFocus({ stops: stops(4), tripStatus: 'completed' }).phase).toBe('none');
  });

  it('names a stop by its name, or by its number when the name is missing', () => {
    expect(stopLabel({ name: 'Panacan' })).toBe('Panacan');
    expect(stopLabel({}, 2)).toBe('Stop 3');
  });
});
