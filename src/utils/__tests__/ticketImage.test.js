import { describe, expect, it, vi } from 'vitest'
import { buildTicketImageModel, deliverImage, ticketFileName } from '../ticketImage'

const ticket = {
  ticket_uuid: 'abcdef12-3456-7890-abcd-ef1234567890',
  qr_content: 'abcdef12-3456-7890-abcd-ef1234567890',
  group_qr_content: 'grp:TXN-1',
  transaction_reference: 'TXN-1',
  origin: 'Alpha',
  destination: 'Beta',
  seat_type: 'seated',
  amount: 80,
  departure_label: '2026/10/01 - 08:00',
}

describe('buildTicketImageModel', () => {
  it('carries the identifiers a passenger and conductor need', () => {
    const model = buildTicketImageModel(ticket)
    expect(model.qrContent).toBe(ticket.qr_content)
    const byLabel = Object.fromEntries(model.lines.map((l) => [l.label, l.value]))
    expect(byLabel['Ticket ID']).toBe('ABCDEF12')
    expect(byLabel.Transaction).toBe('TXN-1')
    expect(byLabel.Route).toBe('Alpha to Beta')
    expect(byLabel['Fare paid']).toBe('PHP 80.00')
  })

  it('builds the group image from the group QR payload', () => {
    const model = buildTicketImageModel(ticket, { group: true, groupSize: 3 })
    expect(model.qrContent).toBe('grp:TXN-1')
    expect(model.lines[0]).toEqual({ label: 'Group boarding QR', value: '3 tickets' })
  })

  it('has no QR content for a ticket whose QR is not active yet, so nothing can be rendered', () => {
    expect(buildTicketImageModel({ ...ticket, qr_content: null }).qrContent).toBeNull()
  })
})

describe('ticketFileName', () => {
  it('uses the chosen format extension', () => {
    expect(ticketFileName(ticket, 'png')).toBe('smart-transit-ticket-ABCDEF12.png')
    expect(ticketFileName(ticket, 'jpeg')).toBe('smart-transit-ticket-ABCDEF12.jpg')
    expect(ticketFileName(ticket, 'png', { group: true })).toBe('smart-transit-group-TXN-1.png')
  })
})

describe('deliverImage', () => {
  const blob = new Blob(['x'], { type: 'image/png' })

  it('uses the share sheet when files can be shared', async () => {
    const share = vi.fn().mockResolvedValue()
    const nav = { canShare: () => true, share }
    await expect(deliverImage(blob, 'a.png', { navigator: nav })).resolves.toBe('shared')
    expect(share).toHaveBeenCalledOnce()
  })

  it('reports a dismissed share sheet as cancelled and does not download', async () => {
    const nav = { canShare: () => true, share: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' })) }
    const click = vi.fn()
    const doc = { createElement: () => ({ click, remove: vi.fn() }), body: { appendChild: vi.fn() } }
    await expect(deliverImage(blob, 'a.png', { navigator: nav, document: doc, URL: { createObjectURL: vi.fn(), revokeObjectURL: vi.fn() } })).resolves.toBe('cancelled')
    expect(click).not.toHaveBeenCalled()
  })

  it('falls back to a download when files cannot be shared', async () => {
    const click = vi.fn()
    const anchor = { click, remove: vi.fn() }
    const doc = { createElement: () => anchor, body: { appendChild: vi.fn() } }
    const urlApi = { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }
    await expect(deliverImage(blob, 'a.png', { navigator: {}, document: doc, URL: urlApi })).resolves.toBe('downloaded')
    expect(anchor.download).toBe('a.png')
    expect(click).toHaveBeenCalledOnce()
  })
})
