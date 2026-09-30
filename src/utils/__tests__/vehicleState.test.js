import { describe, expect, test } from 'vitest'
import { computeVehicleState, formatAge } from '../vehicleState'
import { sliceLineBetween } from '../geo'

const line = [[125.0, 7.0], [125.0, 7.1], [125.0, 7.2]]
const now = new Date('2026-09-29T10:00:00Z').getTime()
const iso = (secondsAgo) => new Date(now - secondsAgo * 1000).toISOString()

describe('computeVehicleState', () => {
  test('no coordinates is the no_gps state with no marker', () => {
    const result = computeVehicleState({ vehicle: null, routeCoords: line, nowMs: now })
    expect(result.state).toBe('no_gps')
    expect(result.coord).toBeNull()
  })

  test('weak accuracy is ignored: no marker, explicit message', () => {
    const result = computeVehicleState({
      vehicle: { latitude: 7.05, longitude: 125.0, accuracy: 400, recordedAt: iso(5) },
      routeCoords: line,
      nowMs: now,
    })
    expect(result.state).toBe('weak')
    expect(result.coord).toBeNull()
    expect(result.label).toContain('weak')
  })

  test('a fresh on-route fix is projected onto the line', () => {
    const result = computeVehicleState({
      vehicle: { latitude: 7.05, longitude: 125.0004, accuracy: 10, recordedAt: iso(5) },
      routeCoords: line,
      nowMs: now,
    })
    expect(result.state).toBe('ok')
    expect(result.coord[0]).toBeCloseTo(125.0, 6)
    expect(result.coord[1]).toBeCloseTo(7.05, 4)
  })

  test('a stale fix reports last seen instead of live', () => {
    const result = computeVehicleState({
      vehicle: { latitude: 7.05, longitude: 125.0, recordedAt: iso(600) },
      routeCoords: line,
      nowMs: now,
    })
    expect(result.state).toBe('stale')
    expect(result.label).toBe('Last seen 10m ago')
  })

  test('far from the route is off_route with the distance, at the raw position', () => {
    const result = computeVehicleState({
      vehicle: { latitude: 7.05, longitude: 125.05, accuracy: 10, recordedAt: iso(5) },
      routeCoords: line,
      nowMs: now,
    })
    expect(result.state).toBe('off_route')
    expect(result.coord).toEqual([125.05, 7.05])
    expect(result.label).toMatch(/not on route \(\d+ m from route\)/)
  })

  test('uses the server projection when provided', () => {
    const result = computeVehicleState({
      vehicle: {
        latitude: 7.06,
        longitude: 125.0,
        recordedAt: iso(5),
        routePosition: { snapped_latitude: 7.0601, snapped_longitude: 125.0, distance_to_route_m: 12, on_route: true },
      },
      routeCoords: [],
      nowMs: now,
    })
    expect(result.state).toBe('ok')
    expect(result.coord).toEqual([125.0, 7.0601])
  })

  test('stale threshold is configurable', () => {
    const vehicle = { latitude: 7.05, longitude: 125.0, recordedAt: iso(30) }
    expect(computeVehicleState({ vehicle, routeCoords: line, nowMs: now, staleAfterSeconds: 10 }).state).toBe('stale')
    expect(computeVehicleState({ vehicle, routeCoords: line, nowMs: now, staleAfterSeconds: 60 }).state).toBe('ok')
  })
})

describe('formatAge', () => {
  test('formats seconds, minutes, hours and days', () => {
    expect(formatAge(5000)).toBe('just now')
    expect(formatAge(45000)).toBe('45s ago')
    expect(formatAge(180000)).toBe('3m ago')
    expect(formatAge(2 * 3600 * 1000)).toBe('2h ago')
    expect(formatAge(26 * 3600 * 1000)).toBe('1d ago')
  })
})

describe('sliceLineBetween', () => {
  test('returns the sub-line between two points regardless of order', () => {
    expect(sliceLineBetween(line, [125.0, 7.1], [125.0, 7.2])).toEqual([[125.0, 7.1], [125.0, 7.2]])
    expect(sliceLineBetween(line, [125.0, 7.2], [125.0, 7.1])).toEqual([[125.0, 7.1], [125.0, 7.2]])
  })
})
