import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('../../api/PassengerService/PassengerService', () => ({
  default: { getTicketResolution: vi.fn(), chooseTicketResolution: vi.fn() },
}))

import PassengerService from '../../api/PassengerService/PassengerService'
import TripCancelledChoice from '../../components/Passenger/Ticket/TripCancelledChoice'
import { CANCELLED_TRIP_STATUSES, refundMethodText, resolutionSummary, ticketStatusLabel } from '../ticketResolution'

const view = (over = {}) => ({
  awaiting_choice: true,
  trip: { route_name: 'Route X', trip_date: '2026-10-06' },
  rebook: { options: [{ trip_id: 11, trip_date: '2026-10-06', boarding_time: '14:30', bus_label: { plate_number: 'AAA 111' } }], message: null },
  refund: { amount: 45, method: 'gateway', needs_review: false, ridden_fare: 0 },
  resolution: null,
  deadline: { configured: false },
  ...over,
})

describe('cancelled-trip wording', () => {
  test('statuses, methods and settled states are worded for the passenger', () => {
    expect(CANCELLED_TRIP_STATUSES).toContain('trip_cancelled')
    expect(ticketStatusLabel('refunded')).toBe('Refunded')
    expect(refundMethodText('cash')).toMatch(/handed back at the terminal/)
    expect(refundMethodText('gateway')).toMatch(/GCash, Maya or card/)
    expect(resolutionSummary(null)).toBe('')
    expect(resolutionSummary({ resolution: 'refund', status: 'succeeded', method: 'gateway', amount: '45.00' })).toBe('Refunded: PHP 45.00 to your original payment method.')
    expect(resolutionSummary({ resolution: 'refund', status: 'succeeded', method: 'gateway', amount: '0.00' })).toMatch(/Nothing to refund/)
    expect(resolutionSummary({ resolution: 'refund', status: 'needs_review', method: 'gateway' })).toMatch(/confirming the amount/)
  })
})

describe('TripCancelledChoice', () => {
  test('a refund needs a second tap and sends only the choice', async () => {
    PassengerService.getTicketResolution.mockResolvedValue({ data: view() })
    PassengerService.chooseTicketResolution.mockResolvedValue({ data: view({ awaiting_choice: false, resolution: { resolution: 'refund', status: 'pending', method: 'gateway', amount: '45.00' } }) })
    const onChanged = vi.fn()
    render(<TripCancelledChoice ticketUuid="u-1" onChanged={onChanged} />)
    expect(await screen.findByTestId('refund-amount')).toHaveTextContent('PHP 45.00')
    fireEvent.click(screen.getByRole('button', { name: 'Ask for a refund' }))
    expect(PassengerService.chooseTicketResolution).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm refund' }))
    await waitFor(() => expect(PassengerService.chooseTicketResolution).toHaveBeenCalledWith('u-1', { choice: 'refund' }))
    expect(onChanged).toHaveBeenCalled()
    expect(await screen.findByTestId('choice-settled')).toHaveTextContent('being processed')
  })

  test('rebook sends the chosen later departure', async () => {
    PassengerService.getTicketResolution.mockResolvedValue({ data: view() })
    PassengerService.chooseTicketResolution.mockResolvedValue({ data: view({ awaiting_choice: false, resolution: { resolution: 'rebook', status: 'succeeded' } }) })
    render(<TripCancelledChoice ticketUuid="u-2" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Rebook this ticket' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm rebook' }))
    await waitFor(() => expect(PassengerService.chooseTicketResolution).toHaveBeenCalledWith('u-2', { choice: 'rebook', trip_id: 11 }))
  })

  test('with no later departure rebooking is disabled and the server message is shown', async () => {
    PassengerService.getTicketResolution.mockResolvedValue({ data: view({ rebook: { options: [], message: 'No later departure today.' } }) })
    render(<TripCancelledChoice ticketUuid="u-3" />)
    expect(await screen.findByTestId('no-rebook')).toHaveTextContent('No later departure today.')
    expect(screen.getByRole('button', { name: 'Rebook this ticket' })).toBeDisabled()
  })

  test('a refund the server cannot price yet shows no amount, and an error leaves the ticket untouched', async () => {
    PassengerService.getTicketResolution.mockResolvedValue({ data: view({ refund: { amount: null, method: 'gateway', needs_review: true } }) })
    PassengerService.chooseTicketResolution.mockRejectedValue(new Error('Already settled'))
    render(<TripCancelledChoice ticketUuid="u-4" />)
    expect(await screen.findByTestId('refund-review')).toBeInTheDocument()
    expect(screen.queryByTestId('refund-amount')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Ask for a refund' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm refund' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Already settled')
  })
})
