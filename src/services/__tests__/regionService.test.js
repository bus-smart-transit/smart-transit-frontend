import { normalizeRegion, regionMapBounds } from '../regionService'
import { describe, expect, it } from 'vitest'

const payload = {
  name: 'Some Region',
  center: { lat: 6.9, lng: 125.7 },
  bbox: { min_lat: 5.3, max_lat: 8.1, min_lng: 124.9, max_lng: 126.7 },
  provinces: { 'Province A': ['Town A', 'Town B'] },
}

describe('regionService', () => {
  it('normalizes the server region payload', () => {
    const region = normalizeRegion(payload)
    expect(region.name).toBe('Some Region')
    expect(region.center).toEqual([125.7, 6.9])
    expect(region.bounds).toEqual({ minLat: 5.3, maxLat: 8.1, minLng: 124.9, maxLng: 126.7 })
    expect(region.provinces['Province A']).toEqual(['Town A', 'Town B'])
  })

  it('returns MapLibre bounds as [[minLng, minLat], [maxLng, maxLat]]', () => {
    expect(regionMapBounds(normalizeRegion(payload))).toEqual([[124.9, 5.3], [126.7, 8.1]])
  })

  it('rejects a payload without a usable bounding box', () => {
    expect(normalizeRegion(null)).toBeNull()
    expect(normalizeRegion({ bbox: { min_lat: 'x' } })).toBeNull()
  })
})
