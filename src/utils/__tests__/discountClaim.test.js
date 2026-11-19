import { describe, expect, it } from 'vitest';
import { claimKeysFor, claimReviewState, itemsWithClaims, ratePercent } from '../discountClaim';

const offered = [{ key: 'student', label: 'Student', rate: 0.2 }, { key: 'senior', label: 'Senior citizen', rate: 0.2 }];

describe('discounts claimed online (Batch 75)', () => {
  it('puts each chosen claim on its own ticket and drops one the bus does not offer', () => {
    expect(claimKeysFor(3, { 0: 'student', 2: 'pwd' }, offered)).toEqual(['student', null, null]);
    const items = itemsWithClaims({ trip_id: 9 }, 2, { 1: 'senior' }, offered);
    expect(items).toEqual([{ trip_id: 9 }, { trip_id: 9, discount_claim_key: 'senior' }]);
  });

  it('tells the Chauffeur when a claim still needs the ID check', () => {
    expect(claimReviewState({ status: 'claimed', label: 'Student' })).toEqual({ reviewable: true, text: 'Student discount claimed. Check the valid ID.' });
    expect(claimReviewState({ status: 'approved', label: 'Student' }).reviewable).toBe(false);
    expect(claimReviewState(null)).toEqual({ reviewable: false, text: '' });
    expect(ratePercent(0.2)).toBe('20%');
  });
});
