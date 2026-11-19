import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

vi.mock('../../../services/bookingService', () => ({
  getTripTimeline: vi.fn(async () => ({ stops: [
    { stop_id: 3, stop_code: 'stop-d', name: 'Stop D', type: 'stop', eta_time: '08:40', is_boarding: true, selectable: false },
    { stop_id: 5, stop_code: 'stop-x', name: 'Stop X', type: 'stop', eta_time: '08:55', selectable: true },
    { stop_id: 4, stop_code: 'stop-e', name: 'Stop E', type: 'terminal', eta_time: '09:10', selectable: true },
  ] })),
  readApiError: (error, fallback) => ({ message: error?.message || fallback }),
}))

import { getTripTimeline } from '../../../services/bookingService'
import { TripCard } from './TripResults'

const trip = (over = {}) => ({
  trip_id: 7, trip_date: '2026-10-05', boarding_time: '08:40', arrival_time: '09:10', duration_minutes: 30,
  origin: { stop_id: 3, name: 'Stop D' }, destination: { stop_id: 4, name: 'Stop E' },
  bus_label: null, run_pattern: null, service: null, service_type: 'regular', bookable: true, seats_left: 12, fare: 40, progress: null,
  ...over,
})

// Batch 49 item 2: a bus that has left is bookable from a stop ahead of it, and "Departed" from a stop behind it.
describe('TripCard on a trip that has left', () => {
  it('shows "On the way" with the next stop and lets the passenger book', () => {
    const onBook = vi.fn()
    render(<TripCard trip={trip({ progress: { state: 'on_the_way', label: 'On the way', next_stop: 'Stop D' } })} onBook={onBook} />)

    expect(screen.getByTestId('trip-progress')).toHaveTextContent('On the way · Next stop: Stop D')
    expect(screen.getByText('12 seats left on this bus')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Book Seat' }))
    expect(onBook).toHaveBeenCalledOnce()
  })

  it('shows "Departed" and cannot be booked from a stop the bus has passed', () => {
    render(<TripCard trip={trip({ bookable: false, progress: { state: 'departed', label: 'Departed', next_stop: null } })} onBook={vi.fn()} />)

    expect(screen.getByTestId('trip-progress')).toHaveTextContent('Departed')
    expect(screen.getByRole('button', { name: 'Departed' })).toBeDisabled()
  })

  it('shows no progress before the bus leaves', () => {
    render(<TripCard trip={trip()} onBook={vi.fn()} />)
    expect(screen.queryByTestId('trip-progress')).not.toBeInTheDocument()
  })
})

// Batch 54 (user, 2026-11-10): Now boarding, the bus type, and View route stops on All available trips.
describe('TripCard, Batch 54', () => {
  it('says NOW BOARDING once the Driver starts boarding, and shows the bus type', () => {
    render(<TripCard trip={trip({ vehicle_class_label: 'Aircon', progress: { state: 'boarding', label: 'Boarding', next_stop: null } })} onBook={vi.fn()} />)
    expect(screen.getByTestId('trip-now-boarding')).toHaveTextContent('Now boarding')
    expect(screen.queryByTestId('trip-progress')).not.toBeInTheDocument()
    expect(screen.getByTestId('trip-bus-type')).toHaveTextContent('Aircon')
  })

  it('has no route stops button without a drop-off handler (the homepage preview)', () => {
    render(<TripCard trip={trip()} onBook={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'View route stops' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('trip-now-boarding')).not.toBeInTheDocument()
  })

  it('loads the stops only when opened, from the boarding stop, and Get off here picks another drop-off', async () => {
    const choose = vi.fn()
    const t = trip({ destination: { stop_id: 4, stop_code: 'stop-e', name: 'Stop E' } })
    render(<TripCard trip={t} onBook={vi.fn()} onChooseDropOff={choose} />)
    expect(getTripTimeline).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'View route stops' }))
    expect(await screen.findAllByTestId('route-stop')).toHaveLength(3)
    expect(getTripTimeline).toHaveBeenCalledWith(7, { boarding_stop_id: 3 })
    expect(screen.getByText('You board here')).toBeInTheDocument()
    expect(screen.getByText('Your drop-off')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Get off at Stop E' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Get off at Stop X' }))
    expect(choose).toHaveBeenCalledWith(t, 'stop-x')
  })
})
