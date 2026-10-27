import { describe, expect, it } from 'vitest';
import { MAX_LEGS, addLeg, canMoveLeg, legTimeValue, planningMessage, removeLastLeg } from '../legPlanning';

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
