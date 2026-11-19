import { describe, expect, it } from 'vitest'
import { BUS_NOT_ASSIGNED, BUS_UNAVAILABLE, busLabelText } from '../busLabel'
import { buildTicketImageModel } from '../ticketImage'

describe('busLabelText', () => {
  it('shows the label the server built', () => {
    expect(busLabelText('Davao Bus - B-014')).toBe('Davao Bus - B-014')
  })

  it('says the label is unavailable when it is missing, never a plate or a fleet id', () => {
    expect(busLabelText(null)).toBe(BUS_UNAVAILABLE)
    expect(busLabelText('')).toBe(BUS_UNAVAILABLE)
    expect(busLabelText('   ')).toBe(BUS_UNAVAILABLE)
    expect(busLabelText(undefined)).toBe(BUS_UNAVAILABLE)
  })

  it('says the bus is not yet assigned when there is no bus', () => {
    expect(busLabelText(null, { assigned: false })).toBe(BUS_NOT_ASSIGNED)
  })
})

describe('saved ticket image', () => {
  const ticket = { ticket_uuid: 'abcdef12-3456', qr_content: 'x', origin: 'A', destination: 'B', plate_number: 'SECRET-PLATE' }

  it('carries the bus label and never the plate', () => {
    const model = buildTicketImageModel({ ...ticket, bus_label: 'Davao Metro Shuttle / DMS - 000001' })
    const byLabel = Object.fromEntries(model.lines.map((l) => [l.label, l.value]))
    expect(byLabel.Bus).toBe('Davao Metro Shuttle / DMS - 000001')
    expect(JSON.stringify(model)).not.toContain('SECRET-PLATE')
  })

  // Batch 62 (user, 2026-11-13): a missing bus or service reads "Not provided"; the saved ticket has no blank line.
  it('says "Not provided" when the ticket has no bus label or service', () => {
    const model = buildTicketImageModel(ticket)
    const byLabel = Object.fromEntries(model.lines.map((l) => [l.label, l.value]))
    expect(byLabel.Bus).toBe(BUS_UNAVAILABLE)
    expect(BUS_UNAVAILABLE).toBe('Not provided')
    expect(byLabel.Service).toBe('Not provided')
  })
})
