import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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
