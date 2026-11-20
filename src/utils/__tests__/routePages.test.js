import { describe, expect, it } from 'vitest';
import { departureBookingHref, provinceFromSlug, provinceHref, routeHref, stopsForDirection } from '../routePages';

// SAMPLE places; the real ones come from the server's region settings.
const provinces = { 'Sample Oriental': ['East Town'], 'Sample City': ['Sample City'] };
const stops = [
  { stop_code: 'sample-terminal', stop_order: 1, stop_type: 'terminal' },
  { stop_code: 'middle-stop', stop_order: 2, stop_type: 'stop' },
  { stop_code: 'skipped', stop_order: 3, stop_type: 'pass_through' },
  { stop_code: 'far-terminal', stop_order: 4, stop_type: 'terminal' },
];

describe('route page links (2026-11-20)', () => {
  it('links a province picture and a route to their pages, and reads the province back from the link', () => {
    expect(provinceHref('Sample Oriental')).toBe('/provinces/sample-oriental');
    expect(routeHref(7)).toBe('/routes/7');
    expect(provinceFromSlug('sample-oriental', provinces)).toBe('Sample Oriental');
    expect(provinceFromSlug('nowhere', provinces)).toBeNull();
  });

  it('orders the usable stops the way a departure runs', () => {
    expect(stopsForDirection(stops, 'outbound').map((s) => s.stop_code)).toEqual(['sample-terminal', 'middle-stop', 'far-terminal']);
    expect(stopsForDirection(stops, 'reverse').map((s) => s.stop_code)).toEqual(['far-terminal', 'middle-stop', 'sample-terminal']);
  });

  it('books a departure from its first stop to its last, in its direction', () => {
    expect(departureBookingHref({ direction: 'reverse', trip_date: '2026-11-21', departure_time: '07:44' }, stops))
      .toBe('/passenger/book?from=far-terminal&to=sample-terminal&date=2026-11-21&time=07%3A44');
    expect(departureBookingHref({ direction: 'outbound' }, [])).toBeNull();
  });
});
