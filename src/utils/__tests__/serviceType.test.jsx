import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FARE_UNAVAILABLE, isExpress, isServedOnService, serviceTypeLabel } from '../serviceType'
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
    expect(serviceTypeLabel('express')).toBe('Express')
    expect(serviceTypeLabel(null)).toBe('Regular')
  })

  it('serves every stopping stop on a regular trip and only express stops on an express trip', () => {
    expect(stops.filter((s) => isServedOnService(s, 'regular')).map((s) => s.stop_id)).toEqual([1, 2, 4, 5])
    expect(stops.filter((s) => isServedOnService(s, 'express')).map((s) => s.stop_id)).toEqual([1, 4, 5])
  })
})

describe('cash ticket pickers on an express trip', () => {
  it('leave out stops the express trip skips, in both directions, and from the destinations', () => {
    expect(orderedStopsForLeg(stops, 'outbound', 'express').map((s) => s.stop_id)).toEqual([1, 4, 5])
    expect(orderedStopsForLeg(stops, 'reverse', 'express').map((s) => s.stop_id)).toEqual([5, 4, 1])
    expect(destinationsAhead(orderedStopsForLeg(stops, 'outbound', 'express'), 1).map((s) => s.stop_id)).toEqual([4, 5])
  })

  it('keep a regular trip unchanged', () => {
    expect(orderedStopsForLeg(stops, 'outbound').map((s) => s.stop_id)).toEqual([1, 2, 4, 5])
    expect(orderedStopsForLeg(stops, 'outbound', 'regular').map((s) => s.stop_id)).toEqual([1, 2, 4, 5])
  })
})

describe('passenger trip card', () => {
  const trip = { trip_id: 7, trip_date: '2026-10-04', boarding_time: '08:00', arrival_time: null, bus_label: 'Davao Bus - B-014', seats_left: 5, fare: null, service_type: 'express', bookable: false, origin: { name: 'A' }, destination: { name: 'D' } }

  it('shows the Express chip and a disabled "Fare unavailable" button, and does not book', () => {
    const onBook = vi.fn()
    render(<TripCard trip={trip} onBook={onBook} />)

    expect(screen.getByTestId('service-type-chip')).toHaveTextContent('Express')
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
