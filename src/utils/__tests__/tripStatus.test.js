import { describe, expect, test } from 'vitest'
import { deriveTripDurationLabel, deriveTripStatus } from '../tripStatus'

const now = new Date('2026-09-30T10:00:00Z').getTime()
const ago = (seconds) => new Date(now - seconds * 1000).toISOString()

describe('deriveTripStatus', () => {
  test('maps lifecycle statuses to labels', () => {
    expect(deriveTripStatus({ status: 'scheduled' }, { nowMs: now }).label).toBe('Scheduled')
    expect(deriveTripStatus({ status: 'delayed' }, { nowMs: now }).label).toBe('Delayed')
    expect(deriveTripStatus({ status: 'boarding' }, { nowMs: now }).label).toBe('Boarding')
    expect(deriveTripStatus({ status: 'completed' }, { nowMs: now }).label).toBe('Completed')
    expect(deriveTripStatus({ status: 'cancelled' }, { nowMs: now }).label).toBe('Cancelled')
  })

  test('a departed trip is in transit unless a stop was acknowledged moments ago', () => {
    expect(deriveTripStatus({ status: 'departed' }, { nowMs: now }).key).toBe('in_transit')
    expect(deriveTripStatus({ status: 'in-progress', last_acknowledged_stop_id: 4, last_acknowledged_at: ago(30) }, { nowMs: now }).key).toBe('at_stop')
    expect(deriveTripStatus({ status: 'departed', last_acknowledged_stop_id: 4, last_acknowledged_at: ago(600) }, { nowMs: now }).key).toBe('in_transit')
  })

  test('the at-stop window is configurable', () => {
    const trip = { status: 'departed', last_acknowledged_stop_id: 4, last_acknowledged_at: ago(300) }
    expect(deriveTripStatus(trip, { nowMs: now, atStopWindowSeconds: 60 }).key).toBe('in_transit')
    expect(deriveTripStatus(trip, { nowMs: now, atStopWindowSeconds: 600 }).key).toBe('at_stop')
  })

  test('an unknown or missing status is reported as unavailable, never invented', () => {
    expect(deriveTripStatus(null, { nowMs: now }).key).toBe('unknown')
    expect(deriveTripStatus({ status: 'weird' }, { nowMs: now }).label).toBe('Status unavailable')
  })
})

describe('deriveTripDurationLabel', () => {
  test('is null before departure', () => {
    expect(deriveTripDurationLabel({ status: 'scheduled' }, now)).toBeNull()
  })

  test('uses elapsed time while running and total time once completed', () => {
    expect(deriveTripDurationLabel({ departed_at: ago(4500) }, now)).toBe('1h 15m')
    expect(deriveTripDurationLabel({ departed_at: ago(1800), completed_at: ago(600) }, now)).toBe('20m')
  })
})
