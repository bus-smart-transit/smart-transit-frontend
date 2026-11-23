import { describe, expect, it } from 'vitest'
import { MAX_CASH_TICKETS, onsiteQuantity } from '../cashTicket'
import { newlyOpenedAlertIds } from '../alertSound'

// 2026-11-23 (advisor): Quantity on a cash sale, and the alarm only for alerts that open after the page loaded.

describe('onsiteQuantity', () => {
  it('sells 1 to 20 tickets to the same stop', () => {
    expect(onsiteQuantity({ quantity: '3' })).toBe(3)
    expect(onsiteQuantity({ quantity: 99 })).toBe(MAX_CASH_TICKETS)
    expect(onsiteQuantity({ quantity: 0 })).toBe(1)
    expect(onsiteQuantity({ quantity: '' })).toBe(1)
    expect(onsiteQuantity({})).toBe(1)
  })

  it('is always one ticket for a checked-in passenger, a discount or a priority seat', () => {
    expect(onsiteQuantity({ quantity: 4, boarding_mode: 'checkin' })).toBe(1)
    expect(onsiteQuantity({ quantity: 4 }, { discount: true })).toBe(1)
    expect(onsiteQuantity({ quantity: 4 }, { priority: true })).toBe(1)
  })
})

describe('newlyOpenedAlertIds', () => {
  const open = (id) => ({ alert_id: id, status: 'open' })

  it('sounds for nothing on the first read', () => {
    expect(newlyOpenedAlertIds(null, [open(1), open(2)])).toEqual([])
  })

  it('names only the alerts that opened since the last read', () => {
    expect(newlyOpenedAlertIds(new Set([1]), [open(1), open(2), { alert_id: 3, status: 'handled' }])).toEqual([2])
  })
})
