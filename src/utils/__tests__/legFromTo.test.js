import { describe, expect, it } from 'vitest';
import { legFromTo } from '../legFromTo';

describe('legFromTo', () => {
  const route = { origin: 'Ecoland Terminal', destination: 'Tagum Terminal' };

  it('reads the route in its own direction on an outbound leg', () => {
    expect(legFromTo(route, 'outbound')).toBe('Ecoland Terminal → Tagum Terminal');
    expect(legFromTo(route, undefined)).toBe('Ecoland Terminal → Tagum Terminal');
  });

  it('swaps the ends on a return leg', () => {
    expect(legFromTo(route, 'reverse')).toBe('Tagum Terminal → Ecoland Terminal');
  });

  it('is null when an end is unknown', () => {
    expect(legFromTo({ origin: 'Ecoland Terminal' }, 'outbound')).toBeNull();
    expect(legFromTo(null, 'reverse')).toBeNull();
  });
});
