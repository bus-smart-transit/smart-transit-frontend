import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { queueActions, queueStateText } from '../ticketResolutionQueue'
import { CancelTripModal, TicketResolutionQueue } from '../../components/Staff/TripCancellationsPanel'

const row = (over = {}) => ({ ticket_uuid: 'abcdef12-0000', status: 'trip_cancelled', trip_id: 7, trip_date: '2026-10-06', route_name: 'Route X', passenger_name: 'Ana', fare_paid: 45, method: 'gateway', resolution: null, ...over })

describe('queue actions are chosen from the server state', () => {
  test('a ticket waiting for a choice can be rebooked or refunded for the passenger', () => {
    expect(queueActions(row())).toEqual(['rebook', 'refund'])
  })

  test('each resolution state offers only the step that is left', () => {
    expect(queueActions(row({ resolution: { resolution: 'refund', status: 'needs_review', method: 'gateway' } }))).toEqual(['review'])
    expect(queueActions(row({ resolution: { resolution: 'refund', status: 'pending', method: 'cash' } }))).toEqual(['cash'])
    expect(queueActions(row({ resolution: { resolution: 'refund', status: 'failed', method: 'gateway' } }))).toEqual(['retry'])
    expect(queueActions(row({ resolution: { resolution: 'refund', status: 'succeeded', method: 'gateway' } }))).toEqual([])
    expect(queueActions(row({ resolution: { resolution: 'rebook', status: 'succeeded', method: 'none' } }))).toEqual([])
  })

  test('state text never promises money that has not moved', () => {
    expect(queueStateText(row())).toMatch(/Waiting for the passenger/)
    expect(queueStateText(row({ resolution: { resolution: 'refund', status: 'pending', method: 'gateway' } }))).toMatch(/waiting for the payment provider/)
    expect(queueStateText(row({ resolution: { resolution: 'refund', status: 'failed', method: 'gateway', failure_reason: 'declined' } }))).toBe('Refund failed: declined')
  })
})
describe('CancelTripModal', () => {
  test('cancelling sends the reason to the server and reports back', async () => {
    const service = { cancelTrip: vi.fn().mockResolvedValue({}) }
    const onDone = vi.fn()
    const onClose = vi.fn()
    render(<CancelTripModal trip={{ trip_id: 9, status: 'scheduled' }} service={service} onClose={onClose} onDone={onDone} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bus broke down' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel the trip' }))
    await waitFor(() => expect(service.cancelTrip).toHaveBeenCalledWith(9, 'Bus broke down'))
    expect(onDone).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  test('a trip that already left explains the part-refund rule and a server error is shown', async () => {
    const service = { cancelTrip: vi.fn().mockRejectedValue(new Error('Trip is already completed')) }
    render(<CancelTripModal trip={{ trip_id: 9, status: 'in-progress' }} service={service} onClose={() => {}} />)
    expect(screen.getByText(/part of the journey the bus did not cover/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel the trip' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Trip is already completed')
  })

})
describe('TicketResolutionQueue', () => {
  test('staff act for a passenger at the counter and the list reloads', async () => {
    const service = {
      getTicketResolutions: vi.fn().mockResolvedValue({ data: [row()] }),
      chooseStaffTicketResolution: vi.fn().mockResolvedValue({}),
    }
    render(<TicketResolutionQueue service={service} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Refund for passenger' }))
    await waitFor(() => expect(service.chooseStaffTicketResolution).toHaveBeenCalledWith('abcdef12-0000', { choice: 'refund', note: 'Staff-assisted' }))
    await waitFor(() => expect(service.getTicketResolutions).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('status')).toHaveTextContent('Refund done')
  })

  test('a refund the server could not price needs an amount and a reason', async () => {
    const service = {
      getTicketResolutions: vi.fn().mockResolvedValue({ data: [row({ resolution: { id: 4, resolution: 'refund', status: 'needs_review', method: 'gateway' } })] }),
      reviewRefund: vi.fn().mockResolvedValue({}),
    }
    render(<TicketResolutionQueue service={service} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Set amount' }))
    const save = screen.getByRole('button', { name: 'Save and refund' })
    expect(save).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Refund amount/), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Last stop unknown' } })
    fireEvent.click(save)
    await waitFor(() => expect(service.reviewRefund).toHaveBeenCalledWith(4, 30, 'Last stop unknown'))
  })

  test('an empty queue says so', async () => {
    render(<TicketResolutionQueue service={{ getTicketResolutions: vi.fn().mockResolvedValue({ data: [] }) }} />)
    expect(await screen.findByText(/No cancelled-trip tickets need attention/)).toBeInTheDocument()
  })
})
