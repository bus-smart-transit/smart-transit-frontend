import { describe, it, expect } from 'vitest';
import { isPinned, parsePin, roundCoord, stopDisplayName } from '../stopPin';

describe('stopPin', () => {
  it('rounds to 6 decimals and reads only real coordinates', () => {
    expect(roundCoord(7.123456789)).toBe(7.123457);
    expect(parsePin('7.1', '125.6')).toEqual({ latitude: 7.1, longitude: 125.6 });
    expect(parsePin('', '125.6')).toBeNull();
    expect(parsePin(null, 1)).toBeNull();
    expect(parsePin('abc', '125')).toBeNull();
    expect(parsePin('95', '125')).toBeNull();
  });

  it('shows the label after the name, and treats old name-placed stops as not pinned', () => {
    expect(stopDisplayName({ stop_name: 'Acacia', location_label: 'Downtown / Poblacion' })).toBe('Acacia (Downtown / Poblacion)');
    expect(stopDisplayName({ stop_name: 'Acacia', location_label: '  ' })).toBe('Acacia');
    expect(isPinned({ location_source: 'name' })).toBe(false);
    expect(isPinned({ location_source: 'pinned' })).toBe(true);
    expect(isPinned({})).toBe(true);
  });
});
