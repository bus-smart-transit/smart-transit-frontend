import { describe, it, expect } from 'vitest';
import { provinceCards, slugOf } from '../provinceCards';

describe('provinceCards', () => {
  it('turns the region settings into cards, a city of its own apart, with photos found by slug', () => {
    const { provinces, cities } = provinceCards({
      'Alpha City': ['Alpha City'],
      'Beta del Norte': ['One', 'Two'],
      'Gamma Ñorte': ['Solo Town'],
    });
    expect(cities).toEqual([{ name: 'Alpha City', image: '/images/provinces/alpha-city.jpg', note: 'City' }]);
    expect(provinces.map((p) => [p.name, p.image, p.note])).toEqual([
      ['Beta del Norte', '/images/provinces/beta-del-norte.jpg', '2 towns and cities'],
      ['Gamma Ñorte', '/images/provinces/gamma-norte.jpg', '1 town or city'],
    ]);
  });

  it('copes with no settings', () => {
    expect(provinceCards(undefined)).toEqual({ provinces: [], cities: [] });
    expect(slugOf('  A  B ')).toBe('a-b');
  });
});
