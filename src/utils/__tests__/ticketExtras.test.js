import { describe, expect, it } from 'vitest';
import { baggageCount, baggagePieces, baggageText, extrasFor, itemsWithExtras, priorityAfterClaim, priorityFromClaim } from '../ticketExtras';

// SAMPLE values. Priority types as the server sends them (booking/window).
const TYPES = [{ key: 'senior', label: 'Senior citizen' }, { key: 'pwd', label: 'Person with disability' }, { key: 'pregnant', label: 'Pregnant' }];

describe('ticketExtras (Batch 76)', () => {
  it('turns a senior or PWD claim into a priority seat, never a student one', () => {
    expect(priorityFromClaim('senior', TYPES)).toBe('senior');
    expect(priorityFromClaim('pwd', TYPES)).toBe('pwd');
    expect(priorityFromClaim('student', TYPES)).toBe('');
    expect(priorityFromClaim(null, TYPES)).toBe('');
  });

  it('keeps only known priority types, one entry per ticket', () => {
    expect(extrasFor(3, { 0: { priority_type: 'pregnant' }, 1: { priority_type: 'vip', baggage: true } }, TYPES)).toEqual([
      { priority_type: 'pregnant', baggage: false, baggage_count: 0 },
      { priority_type: null, baggage: true, baggage_count: 1 },
      { priority_type: null, baggage: false, baggage_count: 0 },
    ]);
  });

  // 2026-11-25 (user): baggage is declared online and paid on board, so only the count is needed.
  // 2026-11-26 (user): a ticket says how many pieces (1 to 10); the summary counts them all.
  it('counts the pieces of baggage, 1 to 10 per ticket', () => {
    expect(baggagePieces({ baggage: true, baggage_count: '3' })).toBe(3);
    expect(baggagePieces({ baggage: true, baggage_count: 25 })).toBe(10);
    expect(baggagePieces({ baggage: true, baggage_count: '' })).toBe(1);
    expect(baggagePieces({ baggage: false, baggage_count: 4 })).toBe(0);
    expect(baggageCount(2, { 0: { baggage: true, baggage_count: 3 }, 1: { baggage: true } })).toBe(4);
    expect(baggageText({ has_baggage: true, baggage_count: 2 })).toBe('2x baggage. Pay the Chauffeur in cash on board');
    expect(baggageText({ has_baggage: true, baggage_count: 2, baggage_paid: 50 })).toBe('2x baggage. Paid PHP 50.00 on board');
  });

  it('counts the tickets that declare baggage', () => {
    expect(baggageCount(2, { 0: { baggage: true }, 1: { baggage: true } })).toBe(2);
    expect(baggageCount(1, { 1: { baggage: true } })).toBe(0);
    expect(baggageCount(1, {})).toBe(0);
  });

  it('adds the choices to the checkout items and leaves the rest alone', () => {
    const items = [{ trip_id: 1, discount_claim_key: 'senior' }, { trip_id: 1 }];
    expect(itemsWithExtras(items, { 0: { priority_type: 'senior', baggage: true } }, TYPES)).toEqual([
      { trip_id: 1, discount_claim_key: 'senior', priority_type: 'senior', baggage: true, baggage_count: 1 },
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
