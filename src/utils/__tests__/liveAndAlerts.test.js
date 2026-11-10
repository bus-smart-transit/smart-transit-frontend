import { describe, expect, test } from 'vitest'
import { concernsTrips, livePositionLngLat, pollEvery } from '../liveUpdates'
import { alertBusText, alertMapLink, alertPlaceSource, crewAlertStatusText, crewRoleLabel, telHref } from '../crewAlerts'

// Batch 58 (user, 2026-11-10): live updates and crew alerts, the pure parts.
describe('live updates', () => {
  test('a bus.moved update puts the bus on the route line when the server placed it there, else where it reported', () => {
    expect(livePositionLngLat({ latitude: 7.1, longitude: 125.6, route_position: { on_route: true, snapped_latitude: 7.2, snapped_longitude: 125.7 } })).toEqual([125.7, 7.2])
    expect(livePositionLngLat({ latitude: 7.1, longitude: 125.6, route_position: { on_route: false, snapped_latitude: 7.2, snapped_longitude: 125.7 } })).toEqual([125.6, 7.1])
    expect(livePositionLngLat({ latitude: 'x' })).toBeNull()
  })

  test('polls slower while live updates arrive, never faster than before', () => {
    expect(pollEvery(12000, false)).toBe(12000)
    expect(pollEvery(12000, true)).toBe(60000)
    expect(pollEvery(90000, true)).toBe(90000)
  })

  test('a trip.status update concerns a screen only when the trip is on it', () => {
    expect(concernsTrips({ trip_id: 5 }, [{ trip_id: 4 }, { trip_id: '5' }])).toBe(true)
    expect(concernsTrips({ trip_id: 6 }, [{ trip_id: 5 }])).toBe(false)
    expect(concernsTrips({}, [{ trip_id: 5 }])).toBe(false)
  })
})

describe('crew alerts wording', () => {
  const alert = { latitude: 7.05, longitude: 125.01, location_source: 'gps', trip: { body_no: 'TA-01', plate_number: 'ABC-123', route_name: 'Ta Route' } }

  test('names the crew role, the bus and the place', () => {
    expect(crewRoleLabel('conductor')).toBe('Chauffeur')
    expect(crewRoleLabel('driver')).toBe('Driver')
    expect(alertBusText(alert)).toBe('TA-01 · Ta Route')
    expect(alertBusText({ trip: {} })).toBe('Not provided')
    expect(alertMapLink(alert)).toBe('https://www.openstreetmap.org/?mlat=7.05&mlon=125.01#map=17/7.05/125.01')
    expect(alertMapLink({ latitude: null, longitude: null })).toBeNull()
    expect(alertPlaceSource(alert)).toBe("From the bus's last GPS report")
    expect(alertPlaceSource({ location_source: null })).toBeNull()
  })

  test('tells the crew where their alert stands', () => {
    expect(crewAlertStatusText({ status: 'open' })).toMatch(/^Alert sent\. Your operator has been told\./)
    expect(crewAlertStatusText({ status: 'handled', handled_note: 'Spare bus coming' })).toBe('Your operator handled this alert. Note: Spare bus coming')
    expect(crewAlertStatusText({ status: 'cancelled' })).toBe('You took this alert back.')
  })

  test('makes a phone link only from a real number', () => {
    expect(telHref('0917 123 4567')).toBe('tel:09171234567')
    expect(telHref('')).toBeNull()
  })
})
