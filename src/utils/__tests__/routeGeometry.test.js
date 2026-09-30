import { describe, expect, test } from 'vitest'
import { boundsFromPoints, normalizeLineStringGeometry, toViewbox } from '../routeGeometry'

describe('normalizeLineStringGeometry', () => {
  test('keeps valid [lng,lat] points and coerces numeric strings', () => {
    expect(normalizeLineStringGeometry({
      type: 'LineString',
      coordinates: [['125.6', '7.1'], [125.7, 7.2]],
    })).toEqual({ type: 'LineString', coordinates: [[125.6, 7.1], [125.7, 7.2]] })
  })

  test('drops malformed points and returns null when fewer than two remain', () => {
    expect(normalizeLineStringGeometry({
      type: 'LineString',
      coordinates: [[125.6, 7.1], ['x', 7.2], [125.8]],
    })).toBeNull()
  })

  test('rejects non-LineString input', () => {
    expect(normalizeLineStringGeometry(null)).toBeNull()
    expect(normalizeLineStringGeometry({ type: 'Point', coordinates: [125.6, 7.1] })).toBeNull()
  })
})

describe('boundsFromPoints / toViewbox', () => {
  test('bounds of any route, padded, in Nominatim viewbox order (left,top,right,bottom)', () => {
    const bounds = boundsFromPoints([[126.2, 6.9], [125.3, 6.7], [125.8, 6.95]], 0.1)
    expect(bounds.minLng).toBeCloseTo(125.2)
    expect(bounds.maxLng).toBeCloseTo(126.3)
    expect(bounds.minLat).toBeCloseTo(6.6)
    expect(bounds.maxLat).toBeCloseTo(7.05)
    expect(toViewbox({ minLng: 1, maxLng: 3, minLat: 5, maxLat: 7 })).toBe('1,7,3,5')
  })

  test('returns null when there are no usable points', () => {
    expect(boundsFromPoints([])).toBeNull()
    expect(boundsFromPoints([[NaN, 1], null])).toBeNull()
  })
})