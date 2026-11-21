import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FARE_UNAVAILABLE, isExpress, servedStopsOnService, serviceTypeLabel } from '../serviceType'
import { destinationsAhead, orderedStopsForLeg } from '../cashTicket'
import { TripCard } from '../../components/Passenger/Trips/TripResults'
import ServiceTypeChip from '../../components/ui/ServiceTypeChip'

const rs = (id, order, type, express) => ({ stop_id: id, stop_order: order, stop_type: type, served_by_express: express, stop: { stop_id: id, stop_name: `Stop ${id}` } })
const stops = [rs(1, 1, 'terminal', true), rs(2, 2, 'stop', false), rs(3, 3, 'pass_through', false), rs(4, 4, 'stop', true), rs(5, 5, 'terminal', true)]

describe('service type helpers', () => {
  it('treats anything but express as regular', () => {
    expect(isExpress('express')).toBe(true)
    expect(isExpress('EXPRESS')).toBe(true)
    expect(isExpress('regular')).toBe(false)
    expect(isExpress(undefined)).toBe(false)
    expect(serviceTypeLabel('express')).toBe('Non-stop') // 2026-11-21 (user): express is shown as Non-stop
    expect(serviceTypeLabel(null)).toBe('Regular')
  })

  // 2026-11-21 (user): a non-stop (express) trip serves only the route's two ends, even where stops are marked.
  it('serves every stopping stop on a regular trip and only the two ends on a non-stop trip', () => {
    expect(servedStopsOnService(stops, 'regular').map((s) => s.stop_id)).toEqual([1, 2, 4, 5])
    expect(servedStopsOnService(stops, 'express').map((s) => s.stop_id)).toEqual([1, 5])
  })
})

describe('cash ticket pickers on an express trip', () => {
  it('leave out every stop between the ends on a non-stop trip, in both directions, and from the destinations', () => {
    expect(orderedStopsForLeg(stops, 'outbound', 'express').map((s) => s.stop_id)).toEqual([1, 5])
    expect(orderedStopsForLeg(stops, 'reverse', 'express').map((s) => s.stop_id)).toEqual([5, 1])
    expect(destinationsAhead(orderedStopsForLeg(stops, 'outbound', 'express'), 1).map((s) => s.stop_id)).toEqual([5])
  })

  it('keep a regular trip unchanged', () => {
    expect(orderedStopsForLeg(stops, 'outbound').map((s) => s.stop_id)).toEqual([1, 2, 4, 5])
    expect(orderedStopsForLeg(stops, 'outbound', 'regular').map((s) => s.stop_id)).toEqual([1, 2, 4, 5])
  })
})

describe('passenger trip card', () => {
  const trip = { trip_id: 7, trip_date: '2026-10-04', boarding_time: '08:00', arrival_time: null, bus_label: 'Davao Bus - B-014', seats_left: 5, fare: null, service_type: 'express', bookable: false, origin: { name: 'A' }, destination: { name: 'D' } }

  it('shows the Non-stop chip and a disabled "Fare unavailable" button, and does not book', () => {
    const onBook = vi.fn()
    render(<TripCard trip={trip} onBook={onBook} />)

    expect(screen.getByTestId('service-type-chip')).toHaveTextContent('Non-stop')
    const button = screen.getByRole('button', { name: FARE_UNAVAILABLE })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onBook).not.toHaveBeenCalled()
  })

  it('books a regular trip as before', () => {
    const onBook = vi.fn()
    render(<TripCard trip={{ ...trip, service_type: 'regular', bookable: true, fare: 58 }} onBook={onBook} />)

    expect(screen.getByTestId('service-type-chip')).toHaveTextContent('Regular')
    fireEvent.click(screen.getByRole('button', { name: 'Book Seat' }))
    expect(onBook).toHaveBeenCalledTimes(1)
  })
})

describe('ServiceTypeChip', () => {
  it('marks the service type as data for the schedule rows', () => {
    render(<ServiceTypeChip serviceType="express" />)
    expect(screen.getByTestId('service-type-chip')).toHaveAttribute('data-service-type', 'express')
  })
})

describe('servedStopsOnService', () => {
  const route = (marked = []) => ['A', 'B', 'C', 'D', 'E'].map((name, i) => ({
    stop_id: i + 1, name, stop_order: i + 1, stop_type: name === 'C' ? 'pass_through' : 'stop', served_by_express: marked.includes(name),
  }));
  const names = (list) => list.map((s) => s.name);

  it('serves every stopping stop on a regular trip', () => {
    expect(names(servedStopsOnService(route(), 'regular'))).toEqual(['A', 'B', 'D', 'E']);
  });

  it('runs express non-stop between the route ends when no stop is marked (2026-11-20)', () => {
    expect(names(servedStopsOnService(route(), 'express'))).toEqual(['A', 'E']);
  });

  // 2026-11-21 (user): marked stops no longer change a non-stop trip.
  it('keeps the two ends even when the route marks other stops', () => {
    expect(names(servedStopsOnService(route(['A', 'D']), 'express'))).toEqual(['A', 'E']);
  });
});
