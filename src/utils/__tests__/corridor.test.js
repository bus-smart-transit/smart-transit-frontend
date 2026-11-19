import { describe, expect, it } from 'vitest'
import { deriveCorridorName } from '../corridor'

describe('deriveCorridorName', () => {
  it('lists the distinct municipalities of the route in travel order', () => {
    const stops = [
      { stop_order: 1, municipality: 'Mati City' },
      { stop_order: 2, municipality: 'Mati City' },
      { stop_order: 3, municipality: 'Mabini' },
      { stop_order: 4, municipality: 'Digos City' },
    ]
    expect(deriveCorridorName(stops)).toBe('Mati City – Mabini – Digos City')
  })

  it('orders by sequence even when the list arrives shuffled, and reads nested stop data', () => {
    const stops = [
      { sequence_number: 2, stop: { municipality: 'Town B' } },
      { sequence_number: 1, stop: { municipality: 'Town A' } },
    ]
    expect(deriveCorridorName(stops)).toBe('Town A – Town B')
  })

  it('returns null (no name) when no stop has a municipality or there are no stops', () => {
    expect(deriveCorridorName([{ stop_order: 1 }, { stop_order: 2, municipality: '  ' }])).toBeNull()
    expect(deriveCorridorName([])).toBeNull()
    expect(deriveCorridorName(undefined)).toBeNull()
  })
})
