import { describe, expect, it, vi } from 'vitest'
import { buildTicketImageModel, canShareFile, deliverFile, manilaDepartureLabel, ticketFileName } from '../ticketImage'
import { detectInAppBrowser, isMobileDevice } from '../inAppBrowser'

const ticket = {
  ticket_uuid: 'abcdef12-3456-7890-abcd-ef1234567890',
  qr_content: 'abcdef12-3456-7890-abcd-ef1234567890',
  group_qr_content: 'grp:TXN-1',
  transaction_reference: 'TXN-1',
  origin: 'Alpha',
  destination: 'Beta',
  seat_type: 'seated',
  amount: 80,
  trip_date: '2026-10-01',
  departure_time: '06:30:00',
}

describe('buildTicketImageModel', () => {
  it('carries ticket id, boarding, alighting, Manila date/time, fare and transaction', () => {
    const model = buildTicketImageModel(ticket)
    const byLabel = Object.fromEntries(model.lines.map((l) => [l.label, l.value]))
    expect(model.qrContent).toBe(ticket.qr_content)
    expect(byLabel['Ticket ID']).toBe('ABCDEF12')
    expect(byLabel.Boarding).toBe('Alpha')
    expect(byLabel.Alighting).toBe('Beta')
    expect(byLabel.Departs).toBe('2026-10-01 06:30 (Manila)')
    expect(byLabel['Fare paid']).toBe('PHP 80.00')
    expect(byLabel.Transaction).toBe('TXN-1')
  })

  it('group image has the group id, passenger count and the group QR payload', () => {
    const model = buildTicketImageModel(ticket, { group: true, groupSize: 3 })
    const byLabel = Object.fromEntries(model.lines.map((l) => [l.label, l.value]))
    expect(model.qrContent).toBe('grp:TXN-1')
    expect(byLabel['Group ID']).toBe('TXN-1')
    expect(byLabel.Passengers).toBe('3')
    expect(byLabel.Boarding).toBe('Alpha')
  })

  it('never embeds a QR the screen would not show', () => {
    expect(buildTicketImageModel({ ...ticket, qr_content: null }).qrContent).toBeNull()
    expect(buildTicketImageModel({ ...ticket, group_qr_content: null }, { group: true }).qrContent).toBeNull()
  })
})

describe('manilaDepartureLabel', () => {
  it('uses the stored Manila values, or converts an instant to Manila time', () => {
    expect(manilaDepartureLabel({ trip_date: '2026-10-01' })).toBe('2026-10-01 (Manila)')
    // 2026-09-30T22:30:00Z is 2026-10-01 06:30 in Manila regardless of the viewer's timezone.
    expect(manilaDepartureLabel({ valid_from: '2026-09-30T22:30:00Z' })).toBe('2026-10-01 06:30 (Manila)')
    expect(manilaDepartureLabel({})).toBe('-')
  })
})

describe('ticketFileName', () => {
  it('is a PNG named after the ticket or the group', () => {
    expect(ticketFileName(ticket)).toBe('smart-transit-ticket-ABCDEF12.png')
    expect(ticketFileName(ticket, { group: true })).toBe('smart-transit-group-TXN-1.png')
  })
})

describe('deliverFile', () => {
  const file = new File(['x'], 'a.png', { type: 'image/png' })
  const phone = (extra = {}) => ({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', canShare: () => true, share: vi.fn().mockResolvedValue(), ...extra })

  it('shares on a phone that can share files, passing the ready file straight through', async () => {
    const nav = phone()
    await expect(deliverFile(file, { navigator: nav })).resolves.toBe('shared')
    expect(nav.share).toHaveBeenCalledWith(expect.objectContaining({ files: [file] }))
  })

  it('treats a dismissed share sheet as a cancel, not a failure, and does not download', async () => {
    const click = vi.fn()
    const nav = phone({ share: vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' })) })
    const doc = { createElement: () => ({ click, remove: vi.fn() }), body: { appendChild: vi.fn() } }
    await expect(deliverFile(file, { navigator: nav, document: doc, URL: { createObjectURL: vi.fn(), revokeObjectURL: vi.fn() } })).resolves.toBe('cancelled')
    expect(click).not.toHaveBeenCalled()
  })

  it('downloads on desktop even when the browser could share files', async () => {
    const nav = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120', canShare: () => true, share: vi.fn() }
    const anchor = { click: vi.fn(), remove: vi.fn() }
    const doc = { createElement: () => anchor, body: { appendChild: vi.fn() } }
    expect(canShareFile(file, { navigator: nav })).toBe(false)
    await expect(deliverFile(file, { navigator: nav, document: doc, URL: { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() } })).resolves.toBe('downloaded')
    expect(nav.share).not.toHaveBeenCalled()
    expect(anchor.download).toBe('a.png')
  })

  it('falls back to a download when a phone cannot share files', async () => {
    const anchor = { click: vi.fn(), remove: vi.fn() }
    const doc = { createElement: () => anchor, body: { appendChild: vi.fn() } }
    const nav = phone({ canShare: () => false })
    await expect(deliverFile(file, { navigator: nav, document: doc, URL: { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() } })).resolves.toBe('downloaded')
  })
})

describe('in-app browser and device detection', () => {
  it('flags Facebook, Messenger and Instagram web views, not Chrome or Safari', () => {
    expect(detectInAppBrowser('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0]')).toBe('Facebook')
    expect(detectInAppBrowser('Mozilla/5.0 (iPhone) AppleWebKit/605 Mobile [FBAN/MessengerForiOS;FBAV/400]')).not.toBeNull()
    expect(detectInAppBrowser('Mozilla/5.0 (iPhone) AppleWebKit/605 Mobile Instagram 300.0')).toBe('Instagram')
    expect(detectInAppBrowser('Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile Safari/537.36')).toBeNull()
    expect(detectInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Version/17.0 Mobile Safari/604.1')).toBeNull()
  })

  it('recognises phones and iPadOS, not desktops', () => {
    expect(isMobileDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 13)' })).toBe(true)
    expect(isMobileDevice({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', maxTouchPoints: 5 })).toBe(true)
    expect(isMobileDevice({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', maxTouchPoints: 0 })).toBe(false)
    expect(isMobileDevice({ userAgent: 'Windows NT 10.0' })).toBe(false)
  })
})
