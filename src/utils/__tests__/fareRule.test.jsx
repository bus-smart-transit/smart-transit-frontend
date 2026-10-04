import { describe, expect, test, vi } from 'vitest'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { buildFareRulePayload } from '../fareRule'
import FareRulesPanel from '../../components/Staff/FareRulesPanel'

vi.mock('../../services/bookingService', () => ({
  getFareOptions: vi.fn().mockResolvedValue({
    vehicle_classes: [{ key: 'ordinary', label: 'Ordinary' }, { key: 'aircon', label: 'Aircon' }],
    service_types: ['regular', 'express'], rounding_modes: ['nearest', 'ceiling'], rounding_increment: '0.01', seat_types: ['seated', 'standing'],
  }),
}))
vi.mock('../../components/Staff/StepUpModal', () => ({ default: ({ open }) => (open ? <div data-testid="step-up-open" /> : null) }))

const base = { scope: 'general', fleet_id: '', vehicle_class: 'aircon', service_type: 'express', route_id: '', seat_type: 'seated', base_fare: '18', base_distance_km: '5', fare_per_km: '2.75', rounding_mode: '', effective_from: '', effective_to: '', note: '' }

describe('buildFareRulePayload', () => {
  test('a general rule carries its class, service type and numbers, and nothing empty', () => {
    expect(buildFareRulePayload(base)).toEqual({ seat_type: 'seated', service_type: 'express', base_fare: 18, fare_per_km: 2.75, vehicle_class: 'aircon', base_distance_km: 5 })
  })

  test('a fleet rule is an override of that fleet; the route belongs to general rules only', () => {
    const payload = buildFareRulePayload({ ...base, scope: 'fleet', fleet_id: '4', vehicle_class: '', route_id: '9', rounding_mode: 'ceiling', note: ' SAMPLE ' })
    expect(payload).toMatchObject({ fleet_id: 4, rounding_mode: 'ceiling', note: 'SAMPLE' })
    expect(payload).not.toHaveProperty('route_id')
    expect(payload).not.toHaveProperty('vehicle_class')
  })

  test('no base distance leaves the plain per-km formula', () => {
    expect(buildFareRulePayload({ ...base, base_distance_km: '' })).not.toHaveProperty('base_distance_km')
  })
})

describe('FareRulesPanel', () => {
  const rules = [
    { fare_rule_id: 1, fleet_id: null, vehicle_class: 'aircon', vehicle_class_label: 'Aircon', service_type: 'express', route_id: null, seat_type: 'seated', base_fare: '18.00', base_distance_km: '5.00', fare_per_km: '2.75', rounding_mode: 'nearest', effective_from: '2026-10-01', effective_to: null, note: 'SAMPLE' },
    { fare_rule_id: 2, fleet_id: 3, fleet: { plate_number: 'DVO-1234' }, vehicle_class: null, service_type: 'regular', route_id: null, seat_type: 'standing', base_fare: '11.00', base_distance_km: null, fare_per_km: '1.75', rounding_mode: 'nearest', effective_from: null, effective_to: null, note: null },
  ]

  test('lists the rules with class, service, base distance, rounding and dates, from the server', async () => {
    const service = { getFareRules: vi.fn().mockResolvedValue({ data: rules }), createFareRule: vi.fn() }
    render(<FareRulesPanel service={service} fleets={[]} routes={[]} canCreateGeneral />)
    const rows = await screen.findAllByTestId('fare-rule-row', {}, { timeout: 5000 })
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Aircon')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Express')).toBeInTheDocument()
    expect(within(rows[0]).getByText('2026-10-01')).toBeInTheDocument()
    expect(within(rows[0]).getByText('SAMPLE')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Fleet DVO-1234')).toBeInTheDocument()
  })

  test('a filter is sent to the server as a query, and an operator cannot choose a general rule', async () => {
    const service = { getFareRules: vi.fn().mockResolvedValue({ data: [] }), createFareRule: vi.fn() }
    render(<FareRulesPanel service={service} fleets={[{ fleet_id: 3, plate_number: 'DVO-1234' }]} routes={[]} canCreateGeneral={false} />)
    await waitFor(() => expect(service.getFareRules).toHaveBeenCalledWith({}))
    fireEvent.change(await screen.findByLabelText('Filter by service type', {}, { timeout: 5000 }), { target: { value: 'express' } })
    await waitFor(() => expect(service.getFareRules).toHaveBeenLastCalledWith({ service_type: 'express' }))
    expect(screen.queryByLabelText('Rule applies to')).toBeNull()
    expect(screen.getByLabelText('Fleet')).toBeInTheDocument()
    expect(screen.queryByLabelText('Vehicle class')).toBeNull()
  })

  test('saving asks for the password confirmation first and sends nothing until it is given', async () => {
    const service = { getFareRules: vi.fn().mockResolvedValue({ data: [] }), createFareRule: vi.fn() }
    render(<FareRulesPanel service={service} fleets={[]} routes={[]} canCreateGeneral />)
    fireEvent.change(await screen.findByLabelText('Vehicle class', {}, { timeout: 5000 }), { target: { value: 'ordinary' } })
    fireEvent.change(screen.getByLabelText('Base fare'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Fare per km'), { target: { value: '2' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Add fare rule' }))
    expect(await screen.findByTestId('step-up-open', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(service.createFareRule).not.toHaveBeenCalled()
  })
})
