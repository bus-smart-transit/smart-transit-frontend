import { describe, expect, it } from 'vitest';
import { MAX_LEGS, addLeg, addRoundTrip, canMoveLeg, evenLegs, legDirectionLabel, legTimeValue, planningMessage, removeLastLeg, removeRoundTrip } from '../legPlanning';

describe('legPlanning', () => {
  it('adds the server flags to the saved message, and nothing when there are none', () => {
    expect(planningMessage('Shift block scheduled.', [])).toBe('Shift block scheduled.');
    expect(planningMessage('Shift block scheduled.', [{ code: 'overtime', message: 'The crew would work about 9 h.' }]))
      .toBe('Shift block scheduled. Check: The crew would work about 9 h.');
  });

  it('lets only a leg that has not started be moved', () => {
    expect(canMoveLeg({ status: 'scheduled' })).toBe(true);
    expect(canMoveLeg({ status: 'delayed' })).toBe(true);
    expect(canMoveLeg({ status: 'boarding' })).toBe(false);
    expect(canMoveLeg(null)).toBe(false);
  });

  it('cuts a stored time to hours and minutes', () => {
    expect(legTimeValue('06:00:00')).toBe('06:00');
    expect(legTimeValue(null)).toBe('');
  });

  it('adds and removes legs within 1 and the maximum', () => {
    expect(addLeg(['06:00'])).toEqual(['06:00', '']);
    expect(addLeg(Array(MAX_LEGS).fill('06:00'))).toHaveLength(MAX_LEGS);
    expect(removeLastLeg(['06:00', '07:00'])).toEqual(['06:00']);
    expect(removeLastLeg(['06:00'])).toEqual(['06:00']);
  });
});

// 2026-11-21 (user, Dynamic Route Scheduling): every schedule goes out and comes back, so legs come in pairs.
describe('out-and-back legs', () => {
  it('adds and removes a round trip (two legs) at a time, keeping at least one pair and at most the limit', () => {
    expect(addRoundTrip(['06:00', '08:00'])).toEqual(['06:00', '08:00', '', '']);
    expect(removeRoundTrip(['06:00', '08:00', '10:00', '12:00'])).toEqual(['06:00', '08:00']);
    expect(removeRoundTrip(['06:00', '08:00'])).toEqual(['06:00', '08:00']);
    const full = Array.from({ length: MAX_LEGS }, (_, i) => `${String(6 + i).padStart(2, '0')}:00`);
    expect(addRoundTrip(full)).toEqual(full);
  });

  it('cuts a suggested list to an even number of legs', () => {
    expect(evenLegs(['06:00', '08:00', '10:00'])).toEqual(['06:00', '08:00']);
    expect(evenLegs(['06:00', '08:00'])).toEqual(['06:00', '08:00']);
    expect(evenLegs(null)).toEqual([]);
  });

  it('names odd legs Outbound and even legs Inbound', () => {
    expect([0, 1, 2, 3].map(legDirectionLabel)).toEqual(['Outbound', 'Inbound', 'Outbound', 'Inbound']);
  });
});
