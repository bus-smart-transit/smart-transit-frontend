import { describe, expect, it } from 'vitest'
import { isDeparted, seatsLeftText, tripProgressText } from '../passengerTripProgress'

describe('passengerTripProgress (Batch 49 item 2)', () => {
  it('reads the server progress plainly', () => {
    expect(tripProgressText(null)).toBeNull()
    expect(tripProgressText({ state: 'boarding', label: 'Boarding' })).toBe('Boarding')
    expect(tripProgressText({ state: 'departed', label: 'Departed' })).toBe('Departed')
    expect(tripProgressText({ state: 'on_the_way', label: 'On the way', next_stop: 'Maa' })).toBe('On the way · Next stop: Maa')
    expect(tripProgressText({ state: 'on_the_way', label: 'On the way', next_stop: null })).toBe('On the way · Next stop: Not provided')
  })

  it('knows a departed trip', () => {
    expect(isDeparted({ state: 'departed' })).toBe(true)
    expect(isDeparted({ state: 'on_the_way' })).toBe(false)
    expect(isDeparted(null)).toBe(false)
  })

  it('says the seats are for the whole bus, and unknown is not zero', () => {
    expect(seatsLeftText(1)).toBe('1 seat left on this bus')
    expect(seatsLeftText(30)).toBe('30 seats left on this bus')
    expect(seatsLeftText(0)).toBe('0 seats left on this bus')
    expect(seatsLeftText(undefined)).toBe('Seats left: Not provided')
  })
})
