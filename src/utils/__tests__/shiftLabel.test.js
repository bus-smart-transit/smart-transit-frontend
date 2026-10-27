import { describe, expect, it } from 'vitest';
import { shiftLabel } from '../shiftLabel';

describe('shiftLabel', () => {
  it('names a block by its shift', () => {
    expect(shiftLabel('morning')).toBe('Morning shift');
    expect(shiftLabel('afternoon')).toBe('Afternoon shift');
  });

  it('says "Shift" when the type is not known', () => {
    expect(shiftLabel(null)).toBe('Shift');
  });
});
