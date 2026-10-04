import { describe, expect, test } from 'vitest'
import { GPS_HEARTBEAT_MS, GPS_MIN_DISTANCE_M, approxMeters, shouldSendPing } from '../gpsPing'

describe('shouldSendPing', () => {
  test('the first position is always sent', () => {
    expect(shouldSendPing({ movedMeters: null, msSinceLastSend: null })).toBe(true)
  })

  test('a moving bus is sent every tick once it has moved the minimum distance', () => {
    expect(shouldSendPing({ movedMeters: GPS_MIN_DISTANCE_M, msSinceLastSend: 10000 })).toBe(true)
    expect(shouldSendPing({ movedMeters: GPS_MIN_DISTANCE_M - 1, msSinceLastSend: 10000 })).toBe(false)
  })

  test('a stationary bus is resent on the heartbeat, which stays under the server\'s 90 s stale limit', () => {
    expect(shouldSendPing({ movedMeters: 0, msSinceLastSend: GPS_HEARTBEAT_MS - 1 })).toBe(false)
    expect(shouldSendPing({ movedMeters: 0, msSinceLastSend: GPS_HEARTBEAT_MS })).toBe(true)
    expect(GPS_HEARTBEAT_MS).toBeLessThan(90000)
  })
})

describe('approxMeters', () => {
  test('is null without two points and about 111 m per 0.001 degree of latitude', () => {
    expect(approxMeters(null, { latitude: 1, longitude: 1 })).toBeNull()
    expect(Math.round(approxMeters({ latitude: 7.001, longitude: 125 }, { latitude: 7, longitude: 125 }))).toBe(111)
  })
})
