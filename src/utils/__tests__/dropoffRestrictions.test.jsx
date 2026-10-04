import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { areaAt, areaToGeoJson, insideAreaMessage, pinFeedback, pointKindLabel, projectOntoLine } from '../dropoffRestrictions'
import { boardingPointView, buildOnsiteItem } from '../cashTicket'

// A straight made-up line along one meridian: about 0.01 degree of latitude is 1,112 m.
const LINE = [[125.0, 7.0], [125.0, 7.36]]
const AREAS = [{ id: 1, name: 'Test Zone', from_m: 10000, to_m: 30000 }]

vi.mock('../../components/Map/RouteMap', () => ({ default: () => <div data-testid="route-map" /> }))
vi.mock('../../services/routeMapService', () => ({
  fetchRouteMapData: vi.fn().mockResolvedValue({ geometry: { coordinates: [[125.0, 7.0], [125.0, 7.36]] } }),
}))
vi.mock('../../services/bookingService', () => ({
  readApiError: (err, fallback) => ({ message: err?.message || fallback }),
  searchAddress: vi.fn().mockResolvedValue([]),
}))

import CustomDropoffModal from '../../components/Passenger/Timeline/CustomDropoffModal'

describe('client feedback for restricted areas (the server is still the judge)', () => {
  test('projects a pin onto the leg line and measures along it', () => {
    const near = projectOntoLine(LINE, 7.15, 125.0003)
    expect(near.alongM).toBeGreaterThan(16000)
    expect(near.alongM).toBeLessThan(17000)
    expect(near.distanceToLineM).toBeLessThan(40)
    expect(projectOntoLine([[1, 1]], 1, 1)).toBeNull()
  })

  test('says which area a distance is in, and uses the server\'s wording', () => {
    expect(areaAt(AREAS, 16000)).toMatchObject({ name: 'Test Zone' })
    expect(areaAt(AREAS, 5000)).toBeNull()
    expect(areaAt(AREAS, 30000)).toMatchObject({ name: 'Test Zone' })
    expect(insideAreaMessage(AREAS[0])).toBe('Custom drop-off is not available inside Test Zone. Please choose an official stop.')
  })

  test('a pin inside an area is refused, one outside is fine, and one behind the boarding point is refused', () => {
    expect(pinFeedback({ pin: { lat: 7.15, lng: 125.0 }, lineCoords: LINE, areas: AREAS })).toBe('Custom drop-off is not available inside Test Zone. Please choose an official stop.')
    expect(pinFeedback({ pin: { lat: 7.31, lng: 125.0 }, lineCoords: LINE, areas: AREAS })).toBeNull()
    expect(pinFeedback({ pin: { lat: 7.05, lng: 125.0 }, lineCoords: LINE, areas: AREAS, boardingAlongM: 20000 })).toContain('behind')
    expect(pinFeedback({ pin: null, lineCoords: LINE, areas: AREAS })).toBeNull()
    expect(pinFeedback({ pin: { lat: 7.15, lng: 125.0 }, lineCoords: [], areas: AREAS })).toBeNull()
  })

  test('turns an area\'s [lat, lng] path into a map line, and words a point\'s kind', () => {
    expect(areaToGeoJson({ id: 4, name: 'X', path: [[7.1, 125.0], [7.2, 125.1]] }).geometry.coordinates).toEqual([[125.0, 7.1], [125.1, 7.2]])
    expect(pointKindLabel('barangay')).toBe('Barangay')
    expect(pointKindLabel(null)).toBe('')
  })

  test('the Chauffeur\'s item names a designated point by id only, never by coordinates or label', () => {
    const form = { boarding_mode: 'stop', origin_stop_id: '2', seat_type: 'seated', dropoff: { pointId: 9, lat: 7.3, lng: 125.0, label: 'Typed', kind: 'landmark' } }
    expect(buildOnsiteItem({ tripId: 7, form })).toEqual({ trip_id: 7, seat_type: 'seated', origin_stop_id: 2, alighting_point_id: 9 })
    expect(boardingPointView({ state: 'good', boarding_point: { distance_from_origin_km: 3, distance_along_leg_m: 3123.4 }, destinations: [] }).alongLegM).toBe(3123.4)
    expect(boardingPointView({ state: 'stale' }).alongLegM).toBeNull()
  })
})

const baseProps = { open: true, routeId: 1, direction: 'outbound', highlight: null, onClose: () => {}, onConfirm: () => {} }

describe('CustomDropoffModal', () => {
  test('free pin: a pin inside a restricted area is refused above the button and Confirm stays off', async () => {
    const options = { mode: 'free_pin', available: true, reason: null, restricted_areas: AREAS, needs_review: [], designated_points: [] }
    const { rerender } = render(<CustomDropoffModal {...baseProps} options={options} pin={null} onPinChange={() => {}} />)
    expect(screen.getByTestId('restricted-legend')).toHaveTextContent('Test Zone')

    rerender(<CustomDropoffModal {...baseProps} options={options} pin={{ lat: 7.15, lng: 125.0, label: '' }} onPinChange={() => {}} />)
    const message = await screen.findByTestId('dropoff-message')
    expect(message).toHaveTextContent('Custom drop-off is not available inside Test Zone. Please choose an official stop.')
    expect(message).toHaveTextContent('final')
    expect(screen.getByRole('button', { name: 'Use this drop-off' })).toBeDisabled()

    rerender(<CustomDropoffModal {...baseProps} options={options} pin={{ lat: 7.31, lng: 125.0, label: '' }} onPinChange={() => {}} />)
    await waitFor(() => expect(screen.queryByTestId('dropoff-message')).toBeNull())
    expect(screen.getByRole('button', { name: 'Use this drop-off' })).toBeEnabled()
  })

  test('a server refusal wins and says so, even when the device check passed', async () => {
    const options = { mode: 'free_pin', available: true, reason: null, restricted_areas: AREAS, needs_review: [], designated_points: [] }
    render(<CustomDropoffModal {...baseProps} options={options} pin={{ lat: 7.31, lng: 125.0 }} error="That point is 200 m from the route." onPinChange={() => {}} />)
    const message = await screen.findByTestId('dropoff-message')
    expect(message).toHaveTextContent('That point is 200 m from the route.')
    expect(message).toHaveTextContent('answer is final')
    expect(screen.getByRole('button', { name: 'Use this drop-off' })).toBeDisabled()
  })

  test('when the rest of the trip is restricted the option is off with the server\'s reason, and only official stops remain', () => {
    const options = { mode: 'free_pin', available: false, reason: 'Custom drop-off is not available for the rest of this trip (inside Test Zone). Please choose an official stop.', restricted_areas: AREAS, needs_review: [], designated_points: [] }
    render(<CustomDropoffModal {...baseProps} options={options} pin={null} onPinChange={() => {}} />)
    expect(screen.getByTestId('dropoff-unavailable')).toHaveTextContent('rest of this trip')
    expect(screen.getByTestId('dropoff-unavailable')).toHaveTextContent('Official stops are still available')
    expect(screen.queryByRole('button', { name: /Use this drop-off/ })).toBeNull()
    expect(screen.queryByPlaceholderText(/Search an address/)).toBeNull()
  })

  test('listed points only: no search and no free pin, the points are a list, and choosing one sends its id', () => {
    const options = {
      mode: 'designated_points', available: true, reason: null, restricted_areas: AREAS, needs_review: [],
      designated_points: [
        { id: 4, name: 'Point One', kind: 'barangay', municipality: 'Town A', latitude: 7.31, longitude: 125.0 },
        { id: 5, name: 'Point Two', kind: 'landmark', municipality: null, latitude: 7.33, longitude: 125.0 },
      ],
    }
    const onPinChange = vi.fn()
    const { rerender } = render(<CustomDropoffModal {...baseProps} options={options} pin={null} onPinChange={onPinChange} />)
    expect(screen.getByRole('heading', { name: 'Choose your drop-off point' })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/Search an address/)).toBeNull()
    const list = screen.getByTestId('designated-points')
    expect(within(list).getAllByRole('radio')).toHaveLength(2)
    expect(within(list).getByText('Barangay')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use this drop-off point' })).toBeDisabled()

    fireEvent.click(within(list).getByLabelText(/Point Two/))
    expect(onPinChange).toHaveBeenCalledWith({ lat: 7.33, lng: 125.0, label: 'Point Two', pointId: 5, kind: 'landmark' })

    rerender(<CustomDropoffModal {...baseProps} options={options} pin={{ lat: 7.33, lng: 125.0, label: 'Point Two', pointId: 5, kind: 'landmark' }} onPinChange={onPinChange} />)
    expect(screen.getByRole('button', { name: 'Use this drop-off point' })).toBeEnabled()
  })

  test('shows a warning, not a block of official stops, while a restricted area is under review', () => {
    const options = { mode: 'free_pin', available: false, reason: 'Custom drop-off is not available on this route right now: the restricted area "Test Zone" has to be reviewed. Please choose an official stop.', restricted_areas: [], needs_review: [{ id: 1, name: 'Test Zone', reason: 'An end stop moved' }], designated_points: [] }
    render(<CustomDropoffModal {...baseProps} options={options} pin={null} onPinChange={() => {}} />)
    expect(screen.getByTestId('restriction-review-warning')).toHaveTextContent('Official stops are not affected')
    expect(screen.getByTestId('dropoff-unavailable')).toHaveTextContent('has to be reviewed')
  })

  test('without options (older callers) it still works as the plain pin screen', () => {
    render(<CustomDropoffModal {...baseProps} pin={{ lat: 7.31, lng: 125.0 }} onPinChange={() => {}} />)
    expect(screen.getByPlaceholderText(/Search an address/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use this drop-off' })).toBeEnabled()
  })
})
