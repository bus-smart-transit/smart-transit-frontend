import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import RunInfoChips from '../../components/ui/RunInfoChips'
import { buildTicketImageModel } from '../ticketImage'
import { pickRunInfo, runPatternLabel, servedStopsText, serviceLabel } from '../runInfo'

const express = { type: 'express', label: 'Express', non_stop: false, served_stops: [{ name: 'Alpha' }, { name: 'Beta' }, { name: 'Omega' }] }
const nonStop = { type: 'express', label: 'Express - Non-stop', non_stop: true, served_stops: [{ name: 'Alpha' }, { name: 'Omega' }] }
const regular = { type: 'regular', label: 'Regular', non_stop: false, served_stops: [] }

describe('run info wording (from the server, never invented)', () => {
  test('run pattern and service labels pass through, and missing data gives nothing', () => {
    expect(runPatternLabel({ key: 'round_trip', label: 'Round-trip run' })).toBe('Round-trip run')
    expect(runPatternLabel(null)).toBe('')
    expect(serviceLabel(nonStop, 'express')).toBe('Express - Non-stop')
    expect(serviceLabel(null, 'express')).toBe('Express')
    expect(serviceLabel(null, 'regular')).toBe('Regular')
    expect(serviceLabel(null, undefined)).toBe('')
  })

  test('the served stops are listed for an express, "Serves only" when it is non-stop, and never for a regular trip', () => {
    expect(servedStopsText(express)).toBe('Stops at: Alpha, Beta, Omega')
    expect(servedStopsText(nonStop)).toBe('Serves only: Alpha, Omega')
    expect(servedStopsText(regular)).toBe('')
    expect(servedStopsText({ type: 'express', served_stops: [] })).toBe('')
  })

  test('run info is read from run_info (trips, tickets) or from top-level fields (cards, booking list)', () => {
    expect(pickRunInfo({ run_info: { run_pattern: { label: 'One-way run' }, service: regular } }).runPattern.label).toBe('One-way run')
    expect(pickRunInfo({ run_pattern: { label: 'Round-trip run' }, service: express }).service.label).toBe('Express')
    expect(pickRunInfo({})).toEqual({ runPattern: null, service: null })
  })
})

describe('RunInfoChips', () => {
  test('shows the round-trip run chip, the express chip and the served stops', () => {
    render(<RunInfoChips runPattern={{ key: 'round_trip', label: 'Round-trip run' }} service={express} showStops />)
    expect(screen.getByTestId('run-pattern-chip')).toHaveTextContent('Round-trip run')
    expect(screen.getByTestId('service-type-chip')).toHaveTextContent('Express')
    expect(screen.getByTestId('served-stops')).toHaveTextContent('Stops at: Alpha, Beta, Omega')
  })

  test('shows Express - Non-stop when the server derived it, and Regular with no stop list', () => {
    const { rerender } = render(<RunInfoChips service={nonStop} showStops />)
    expect(screen.getByTestId('service-type-chip')).toHaveTextContent('Express - Non-stop')
    expect(screen.getByTestId('served-stops')).toHaveTextContent('Serves only: Alpha, Omega')
    rerender(<RunInfoChips service={regular} runPattern={{ key: 'one_way', label: 'One-way run' }} showStops />)
    expect(screen.getByTestId('service-type-chip')).toHaveTextContent('Regular')
    expect(screen.getByTestId('run-pattern-chip')).toHaveTextContent('One-way run')
    expect(screen.queryByTestId('served-stops')).toBeNull()
  })

  test('renders nothing for a fact that is missing', () => {
    const { container } = render(<RunInfoChips />)
    expect(container).toBeEmptyDOMElement()
    render(<RunInfoChips serviceType="regular" />)
    expect(screen.queryByTestId('run-pattern-chip')).toBeNull()
    expect(screen.getByTestId('service-type-chip')).toHaveTextContent('Regular')
  })
})

describe('the saved QR image', () => {
  const ticket = { ticket_uuid: 'abcdef12-0000', qr_content: 'x', origin: 'Alpha', destination: 'Omega', service_type: 'express', trip_date: '2026-10-05', departure_time: '08:00' }

  test('carries the run pattern, the service and the served stops when the data has them', () => {
    const model = buildTicketImageModel({ ...ticket, run_info: { run_pattern: { label: 'Round-trip run' }, service: express } })
    const lines = Object.fromEntries(model.lines.map((l) => [l.label, l.value]))
    expect(lines.Service).toBe('Express')
    expect(lines.Run).toBe('Round-trip run')
    expect(lines.Stops).toBe('Alpha, Beta, Omega')
  })

  test('adds no Run or Stops line when there is no run info (nothing invented)', () => {
    const labels = buildTicketImageModel({ ...ticket, service_type: 'regular' }).lines.map((l) => l.label)
    expect(labels).not.toContain('Run')
    expect(labels).not.toContain('Stops')
    expect(labels).toContain('Service')
  })
})
