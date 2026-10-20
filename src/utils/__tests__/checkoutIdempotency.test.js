import { beforeEach, describe, expect, it } from 'vitest';
import { checkoutIdempotencyKey, clearCheckoutIdempotencyKey } from '../checkoutIdempotency';

describe('checkout idempotency keys', () => {
  beforeEach(() => sessionStorage.clear());

  it('reuses a key for the same scope and payload', () => {
    const payload = { items: [{ trip_id: 7, seat_type: 'seated' }] };

    expect(checkoutIdempotencyKey('passenger', payload)).toBe(checkoutIdempotencyKey('passenger', payload));
  });

  it('canonicalizes object property order while preserving array order', () => {
    const first = checkoutIdempotencyKey('passenger', { trip_id: 7, items: [{ seat_type: 'seated', trip_id: 7 }] });
    const reordered = checkoutIdempotencyKey('passenger', { items: [{ trip_id: 7, seat_type: 'seated' }], trip_id: 7 });

    expect(reordered).toBe(first);
  });

  it('rotates the key when the scope or payload changes', () => {
    const payload = { items: [{ trip_id: 7, seat_type: 'seated' }] };
    const first = checkoutIdempotencyKey('passenger', payload);

    expect(checkoutIdempotencyKey('passenger', { items: [{ trip_id: 8, seat_type: 'seated' }] })).not.toBe(first);
    expect(checkoutIdempotencyKey('cash', payload)).not.toBe(first);
  });

  it('clears a key only for its matching checkout scope', () => {
    const key = checkoutIdempotencyKey('passenger', { trip_id: 7 });

    clearCheckoutIdempotencyKey('cash');
    expect(checkoutIdempotencyKey('passenger', { trip_id: 7 })).toBe(key);

    clearCheckoutIdempotencyKey('passenger');
    expect(checkoutIdempotencyKey('passenger', { trip_id: 7 })).not.toBe(key);
  });
});