import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { queueActions, queueStateText } from '../ticketResolutionQueue'
import { EMPTY_WINDOW, buildWindowPayload, windowFormFromReportRow, windowText } from '../durationFactors'
import { CancelTripModal, TicketResolutionQueue } from '../../components/Staff/TripCancellationsPanel'
import DurationFactorsPanel from '../../components/Staff/DurationFactorsPanel'

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

describe('duration window helpers', () => {
  test('the form becomes a numeric payload with null for "both" and "every day"', () => {
    const payload = buildWindowPayload({ ...EMPTY_WINDOW, route_id: '3', factor: '1.5', note: ' ' })
    expect(payload).toMatchObject({ route_id: 3, direction: null, day_type: null, factor: 1.5, source: 'manual', note: null })
  })

  test('a report row with enough data pre-fills a form, one without gives nothing', () => {
    const form = windowFormFromReportRow({ route_id: 3, direction: 'outbound', hour: 7, samples: 12, median_minutes: 90, enough_data: true, proposed_factor: 1.5 })
    expect(form).toMatchObject({ route_id: '3', direction: 'outbound', start_time: '07:00', end_time: '08:00', factor: '1.5', source: 'measured' })
    expect(windowFormFromReportRow({ route_id: 3, hour: 7, enough_data: false, proposed_factor: null })).toBeNull()
    expect(windowText({ start_time: '07:00', end_time: '09:00', day_type: 'weekday', direction: null, factor: '1.50' })).toBe('07:00 - 09:00, weekdays, both directions: x1.5')
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

describe('DurationFactorsPanel', () => {
  const service = () => ({
    getDurationFactors: vi.fn().mockResolvedValue({ data: [{ id: 1, route_id: 3, route_name: 'Route X', direction: null, day_type: 'weekday', start_time: '07:00', end_time: '09:00', factor: '1.50', source: 'manual', label: 'configured', note: null }] }),
    saveDurationFactor: vi.fn().mockResolvedValue({}),
    deleteDurationFactor: vi.fn().mockResolvedValue({}),
    getDurationReport: vi.fn().mockResolvedValue({ data: { rows: [{ route_id: 3, route_name: 'Route X', direction: 'outbound', service_type: 'regular', hour: 7, samples: 12, median_minutes: 90, base_minutes: 60, enough_data: true, proposed_factor: 1.5, note: '' }, { route_id: 3, route_name: 'Route X', direction: 'reverse', service_type: 'regular', hour: 8, samples: 2, median_minutes: 70, base_minutes: 60, enough_data: false, proposed_factor: null, note: 'Not enough data (needs 10 completed legs).' }] } }),
  })

  test('windows are listed as configured and a new one is saved with the typed numbers', async () => {
    const s = service()
    render(<DurationFactorsPanel service={s} routes={[{ route_id: 3, route_name: 'Route X' }]} />)
    expect(await screen.findByText('configured')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Route'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Factor'), { target: { value: '1.4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save window' }))
    await waitFor(() => expect(s.saveDurationFactor).toHaveBeenCalledWith(expect.objectContaining({ route_id: 3, factor: 1.4, source: 'manual' }), null))
  })

  test('the report is a proposal: only rows with enough data can be copied into the form, and nothing is saved', async () => {
    const s = service()
    render(<DurationFactorsPanel service={s} routes={[{ route_id: 3, route_name: 'Route X' }]} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Show report' }))
    expect(await screen.findAllByTestId('duration-report-row')).toHaveLength(2)
    expect(screen.getByText(/Not enough data/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Use as a window' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Use as a window' }))
    expect(screen.getByLabelText('Factor')).toHaveValue(1.5)
    expect(s.saveDurationFactor).not.toHaveBeenCalled()
  })

  test('a window can be removed', async () => {
    const s = service()
    render(<DurationFactorsPanel service={s} routes={[]} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(s.deleteDurationFactor).toHaveBeenCalledWith(1))
  })
})
