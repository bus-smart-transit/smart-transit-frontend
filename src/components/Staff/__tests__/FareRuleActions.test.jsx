import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import FareRulesPanel from '../FareRulesPanel'
import { buildCopyPayload, earliestCopyStart, originalEndsOn, ruleStarted } from '../../../utils/fareRule'

vi.mock('../../../services/bookingService', () => ({
  getFareOptions: vi.fn().mockResolvedValue({
    vehicle_classes: [{ key: 'aircon', label: 'Aircon' }], service_types: ['regular'], rounding_modes: ['nearest'], rounding_increment: '0.01', seat_types: ['seated', 'standing'],
  }),
}))
// The extra check: a button stands in for typing the password.
vi.mock('../StepUpModal', () => ({
  default: ({ open, onVerified }) => (open ? <button type="button" onClick={() => onVerified({ token: 'step-up-1', expiresIn: 600 })}>Verify me</button> : null),
}))
vi.mock('../../../utils/dates', async (importOriginal) => ({ ...(await importOriginal()), getBusinessToday: () => '2026-11-06' }))

// 2026-11-06: Copy and Edit on the fare screen.

const inUse = { fare_rule_id: 7, fleet_id: 1, fleet: { plate_number: 'DMS-001' }, seat_type: 'seated', service_type: 'regular', base_fare: '15.00', fare_per_km: '2.25', base_distance_km: '5.00', effective_from: '2026-11-06', effective_to: null, status: 'active', updated_at: '2026-11-06T08:40:00Z', note: null }
const general = { ...inUse, fare_rule_id: 8, fleet_id: null, fleet: null, vehicle_class: 'aircon' }

let service
beforeEach(() => {
  service = {
    getFareRules: vi.fn().mockResolvedValue({ data: [inUse, general] }),
    createFareRule: vi.fn(),
    copyFareRule: vi.fn().mockResolvedValue({}),
    updateFareRule: vi.fn().mockResolvedValue({}),
  }
})
afterEach(() => vi.clearAllMocks())

describe('fare copy and edit', () => {
  test('date rules: a copy starts tomorrow at the earliest and after the original start; the original ends the day before', () => {
    expect(earliestCopyStart(inUse, '2026-11-06')).toBe('2026-11-07')
    expect(earliestCopyStart({ effective_from: '2026-11-20' }, '2026-11-06')).toBe('2026-11-21')
    expect(earliestCopyStart({ effective_from: null }, '2026-11-06')).toBe('2026-11-07')
    expect(originalEndsOn('2026-11-07')).toBe('2026-11-06')
    expect(ruleStarted(inUse, '2026-11-06')).toBe(true)
    expect(ruleStarted({ effective_from: '2026-11-10' }, '2026-11-06')).toBe(false)
    expect(buildCopyPayload({ effective_from: '2026-11-07', effective_to: '', base_fare: '16', fare_per_km: '2.25', base_distance_km: '5', note: '' }))
      .toEqual({ effective_from: '2026-11-07', base_fare: 16, fare_per_km: 2.25, base_distance_km: 5 })
  })

  test('shows status and when each rule was updated; only the Operator\'s own rules have Copy and Edit', async () => {
    render(<FareRulesPanel service={service} tone="light" />)
    const rows = await screen.findAllByTestId('fare-rule-row')

    expect(within(rows[0]).getByText('Active')).toBeInTheDocument()
    expect(within(rows[0]).getByTestId('fare-rule-updated')).toHaveTextContent('Nov 6, 2026')
    expect(within(rows[0]).getByRole('button', { name: /Copy fare/ })).toBeInTheDocument()
    expect(within(rows[1]).queryByRole('button', { name: /Copy fare/ })).toBeNull()
  })

  test('Copy starts tomorrow with the prices filled in, asks for the extra check, and sends the copy', async () => {
    render(<FareRulesPanel service={service} tone="light" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Copy fare Fleet DMS-001, Seated' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText('Copy starts on')).toHaveValue('2026-11-07')
    expect(within(dialog).getByLabelText('Copy starts on')).toHaveAttribute('min', '2026-11-07')
    expect(within(dialog).getByTestId('copy-original-ends')).toHaveTextContent('2026-11-06')
    fireEvent.change(within(dialog).getByLabelText('Base fare'), { target: { value: '16' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save copy' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Verify me' }))

    await waitFor(() => expect(service.copyFareRule).toHaveBeenCalledWith(7, expect.objectContaining({ effective_from: '2026-11-07', base_fare: 16, fare_per_km: 2.25 }), 'step-up-1'))
    expect(await screen.findByText(/Fare copied/)).toBeInTheDocument()
  })

  test('Edit of a fare in use keeps its prices: it can be stopped with a note', async () => {
    render(<FareRulesPanel service={service} tone="light" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit fare Fleet DMS-001, Seated' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByTestId('fare-in-use-note')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Base fare')).toBeNull()
    fireEvent.click(within(dialog).getByLabelText(/Stop using this fare/))
    fireEvent.change(within(dialog).getByLabelText('Note'), { target: { value: 'No longer followed' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Verify me' }))

    await waitFor(() => expect(service.updateFareRule).toHaveBeenCalledWith(7, { effective_to: null, status: 'inactive', note: 'No longer followed' }, 'step-up-1'))
  })
})
