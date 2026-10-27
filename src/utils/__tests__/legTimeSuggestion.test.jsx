import { describe, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('../../api/StaffService/OperatorService', () => ({ default: { planShiftBlockLegs: vi.fn() } }))

import OperatorService from '../../api/StaffService/OperatorService'
import LegTimeSuggestion from '../../components/Staff/LegTimeSuggestion'

const plan = (legs) => ({ data: { buffer_minutes: 10, note: 'A suggestion only.', legs } })
const leg = (i, dep, over = {}) => ({ leg_index: i, direction: i % 2 ? 'outbound' : 'reverse', suggested_departure: dep, spills_into_next_day: false, factor: 1, factor_label: null, expected_duration_minutes: 60, expected_end: '00:00', ...over })

describe('LegTimeSuggestion', () => {
  const props = { fleetRouteId: '5', date: '2026-10-06', firstTime: '06:00', serviceType: 'regular' }

  test('suggests from the server and applies the times only when asked', async () => {
    OperatorService.planShiftBlockLegs.mockResolvedValue(plan([leg(1, '06:00'), leg(2, '07:10', { factor: 1.5, factor_label: 'configured' })]))
    const onApply = vi.fn()
    render(<LegTimeSuggestion {...props} onApply={onApply} />)
    fireEvent.click(screen.getByRole('button', { name: 'Suggest times' }))
    expect(await screen.findByTestId('suggested-legs')).toHaveTextContent('factor x1.5 configured')
    expect(onApply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Use these times' }))
    expect(onApply).toHaveBeenCalledWith(['06:00', '07:10'])
    expect(OperatorService.planShiftBlockLegs).toHaveBeenCalledWith({ fleet_route_id: '5', scheduled_date: '2026-10-06', first_departure_time: '06:00', service_type: 'regular' })
  })

  test('cannot be pressed until the route, date and first time are chosen', () => {
    render(<LegTimeSuggestion {...props} fleetRouteId="" onApply={() => {}} />)
    expect(screen.getByRole('button', { name: 'Suggest times' })).toBeDisabled()
  })

  test('a plan that stops early or runs past midnight cannot be applied', async () => {
    OperatorService.planShiftBlockLegs.mockResolvedValue(plan([leg(1, '06:00', { expected_duration_minutes: null, expected_end: null })]))
    render(<LegTimeSuggestion {...props} onApply={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Suggest times' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Use these times' })).toBeDisabled())
    expect(screen.getByText(/no stop times/)).toBeInTheDocument()
  })

  test('applies however many legs the server planned, and shows its flags and the travel-time source', async () => {
    OperatorService.planShiftBlockLegs.mockResolvedValue({ data: {
      buffer_minutes: 30, note: 'A suggestion only.',
      legs: [leg(1, '06:00', { duration_source_label: 'Measured from past trips' }), leg(2, '07:30'), leg(3, '09:00'), leg(4, '10:30'), leg(5, '12:00'), leg(6, '13:30')],
      summary: { expected_finish: '14:30' },
      flags: [{ code: 'overtime', message: 'The crew would work about 8 h 30 min.' }],
    } })
    const onApply = vi.fn()
    render(<LegTimeSuggestion {...props} onApply={onApply} />)
    fireEvent.click(screen.getByRole('button', { name: 'Suggest times' }))

    expect(await screen.findByTestId('plan-flags')).toHaveTextContent('8 h 30 min')
    expect(screen.getByTestId('plan-summary')).toHaveTextContent('6 legs, finishing about 14:30')
    expect(screen.getByTestId('suggested-legs')).toHaveTextContent('Measured from past trips')
    fireEvent.click(screen.getByRole('button', { name: 'Use these times' }))
    expect(onApply).toHaveBeenCalledWith(['06:00', '07:30', '09:00', '10:30', '12:00', '13:30'])
  })

  test('a server error is shown', async () => {
    OperatorService.planShiftBlockLegs.mockRejectedValue(new Error('no permission'))
    render(<LegTimeSuggestion {...props} onApply={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Suggest times' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('no permission')
  })
})
