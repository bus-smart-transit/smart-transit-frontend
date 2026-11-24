import { describe, expect, it } from 'vitest';
import { baggageFeeFor, baggageSummary, extrasFor, itemsWithExtras, priorityAfterClaim, priorityFromClaim } from '../ticketExtras';

// SAMPLE values. Priority types as the server sends them (booking/window).
const TYPES = [{ key: 'senior', label: 'Senior citizen' }, { key: 'pwd', label: 'Person with disability' }, { key: 'pregnant', label: 'Pregnant' }];

describe('ticketExtras (Batch 76)', () => {
  it('prices baggage at a share of the full fare, whole pesos', () => {
    expect(baggageFeeFor(100, 50)).toBe(50);
    expect(baggageFeeFor(47, 50)).toBe(24);
    expect(baggageFeeFor(NaN, 50)).toBe(0);
    expect(baggageFeeFor(100, 0)).toBe(0);
  });

  it('turns a senior or PWD claim into a priority seat, never a student one', () => {
    expect(priorityFromClaim('senior', TYPES)).toBe('senior');
    expect(priorityFromClaim('pwd', TYPES)).toBe('pwd');
    expect(priorityFromClaim('student', TYPES)).toBe('');
    expect(priorityFromClaim(null, TYPES)).toBe('');
  });

  it('keeps only known priority types, one entry per ticket', () => {
    expect(extrasFor(3, { 0: { priority_type: 'pregnant' }, 1: { priority_type: 'vip', baggage: true } }, TYPES)).toEqual([
      { priority_type: 'pregnant', baggage: false },
      { priority_type: null, baggage: true },
      { priority_type: null, baggage: false },
    ]);
  });

  it('counts the bags and their total fee', () => {
    expect(baggageSummary(100, 2, { 0: { baggage: true }, 1: { baggage: true } }, 50)).toEqual({ count: 2, total: 100 });
    expect(baggageSummary(100, 1, {}, 50)).toEqual({ count: 0, total: 0 });
  });

  it('adds the choices to the checkout items and leaves the rest alone', () => {
    const items = [{ trip_id: 1, discount_claim_key: 'senior' }, { trip_id: 1 }];
    expect(itemsWithExtras(items, { 0: { priority_type: 'senior', baggage: true } }, TYPES)).toEqual([
      { trip_id: 1, discount_claim_key: 'senior', priority_type: 'senior', baggage: true },
      { trip_id: 1 },
    ]);
  });
});

describe('priorityAfterClaim', () => {
  const PRIORITY = [{ key: 'senior' }, { key: 'pwd' }, { key: 'pregnant' }];
  const DISCOUNTS = [{ key: 'senior' }, { key: 'pwd' }, { key: 'student' }];

  it('a senior or PWD discount sets its priority seat, replacing the other one', () => {
    expect(priorityAfterClaim('', 'senior', PRIORITY, DISCOUNTS)).toBe('senior');
    expect(priorityAfterClaim('senior', 'pwd', PRIORITY, DISCOUNTS)).toBe('pwd');
  });

  it('a student discount or none clears a senior or PWD priority seat', () => {
    expect(priorityAfterClaim('senior', 'student', PRIORITY, DISCOUNTS)).toBe('');
    expect(priorityAfterClaim('pwd', '', PRIORITY, DISCOUNTS)).toBe('');
  });

  it('keeps a pregnant priority seat, which has no discount', () => {
    expect(priorityAfterClaim('pregnant', 'student', PRIORITY, DISCOUNTS)).toBe('pregnant');
    expect(priorityAfterClaim('pregnant', '', PRIORITY, DISCOUNTS)).toBe('pregnant');
  });
});
