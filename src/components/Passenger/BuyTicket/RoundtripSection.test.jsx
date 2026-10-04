import { describe, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RoundtripSection from './RoundtripSection'

const leg = (over) => ({
  trip_id: 1, trip_date: '2026-10-05', boarding_time: '08:10', bus_label: 'Co A - 101', bus_state: 'ready', fare: 46.75,
  origin: { name: 'Stop B' }, destination: { name: 'Stop D' }, journey_leg: 'outbound', ...over,
})

const make = (over = {}) => ({
  active: true, setActive: vi.fn(), returnDate: '2026-10-06', setReturnDate: vi.fn(), returnTime: '14:00', setReturnTime: vi.fn(),
  fieldErrors: {}, loading: false, error: '', canPay: true, blockedReason: '', total: 93.5,
  data: {
    outbound: leg(), return: leg({ trip_id: 2, trip_date: '2026-10-06', boarding_time: '15:10', bus_label: 'Co B - 202', origin: { name: 'Stop D' }, destination: { name: 'Stop B' }, journey_leg: 'return' }),
    cancellation_notice: 'Once you pay, a ticket cannot be cancelled or refunded by you.', can_pay: true,
  },
  ...over,
})

describe('RoundtripSection', () => {
  test('one-way hides everything but the trip type', () => {
    render(<RoundtripSection roundtrip={make({ active: false })} outboundDate="2026-10-05" today="2026-10-04" />)
    expect(screen.getByLabelText('One-way')).toBeChecked()
    expect(screen.queryByLabelText(/Return date/)).toBeNull()
    expect(screen.queryByTestId('roundtrip-notice')).toBeNull()
  })

  test('shows both tickets, each with its own bus, and the no-cancellation rule before payment', () => {
    render(<RoundtripSection roundtrip={make()} outboundDate="2026-10-05" today="2026-10-04" quantity={2} />)
    expect(screen.getByTestId('roundtrip-outbound')).toHaveTextContent('Co A - 101')
    expect(screen.getByTestId('roundtrip-return')).toHaveTextContent('Co B - 202')
    expect(screen.getByTestId('roundtrip-outbound')).toHaveTextContent('PHP 46.75 x 2')
    expect(screen.getByTestId('roundtrip-notice')).toHaveTextContent('cannot be cancelled or refunded')
    expect(screen.queryByTestId('roundtrip-blocked')).toBeNull()
  })

  test('a return bus with no label yet says it is to be assigned, never a plate', () => {
    const data = make().data
    data.return = { ...data.return, bus_label: null, bus_state: 'label_unavailable' }
    render(<RoundtripSection roundtrip={make({ data })} outboundDate="2026-10-05" today="2026-10-04" />)
    expect(screen.getByTestId('roundtrip-return')).toHaveTextContent('Bus to be assigned')
  })

  test('when a leg has no departure it says nothing was charged and shows the server\'s reason', () => {
    const data = { ...make().data, return: null, can_pay: false }
    render(<RoundtripSection roundtrip={make({ data, canPay: false, blockedReason: 'No return departure matches your journey at that date and time.' })} outboundDate="2026-10-05" today="2026-10-04" />)
    expect(screen.getByTestId('roundtrip-blocked')).toHaveTextContent('No return departure matches')
    expect(screen.getByTestId('roundtrip-blocked')).toHaveTextContent('Nothing has been charged')
  })

  test('shows the client-side date errors on the fields, and switching the type calls through', () => {
    const rt = make({ fieldErrors: { returnTime: 'The return must be after your departure time.' }, data: null })
    render(<RoundtripSection roundtrip={rt} outboundDate="2026-10-05" today="2026-10-04" />)
    expect(screen.getByRole('alert')).toHaveTextContent('after your departure time')
    fireEvent.click(screen.getByLabelText('One-way'))
    expect(rt.setActive).toHaveBeenCalledWith(false)
  })
})
