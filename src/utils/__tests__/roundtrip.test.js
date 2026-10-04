import { describe, expect, test } from 'vitest'
import { addDays, buildRoundtripItems, legBusText, roundtripPayState, validateReturnInput } from '../roundtrip'

const base = { outboundDate: '2026-10-05', outboundTime: '08:00', today: '2026-10-04', maxAdvanceDays: 30 }

describe('addDays', () => {
  test('is calendar arithmetic across month and year ends', () => {
    expect(addDays('2026-10-04', 30)).toBe('2026-11-03')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('nonsense', 1)).toBe('')
  })
})

describe('validateReturnInput (Manila dates, compared as text)', () => {
  test('accepts a return later the same day, or any later day inside the window', () => {
    expect(validateReturnInput({ ...base, returnDate: '2026-10-05', returnTime: '08:01' })).toEqual({})
    expect(validateReturnInput({ ...base, returnDate: '2026-10-06', returnTime: '07:00' })).toEqual({})
    expect(validateReturnInput({ ...base, returnDate: '2026-11-03', returnTime: '09:00' })).toEqual({})
  })

  test('refuses a return before or at the departure, in the past, or beyond the window', () => {
    expect(validateReturnInput({ ...base, returnDate: '2026-10-05', returnTime: '08:00' }).returnTime).toMatch(/after your departure/)
    expect(validateReturnInput({ ...base, returnDate: '2026-10-05', returnTime: '07:59' }).returnTime).toBeTruthy()
    expect(validateReturnInput({ ...base, returnDate: '2026-10-04', returnTime: '23:00' }).returnDate).toMatch(/on or after your departure date/)
    expect(validateReturnInput({ ...base, returnDate: '2026-10-03', returnTime: '09:00' }).returnDate).toMatch(/already passed/)
    expect(validateReturnInput({ ...base, returnDate: '2026-11-04', returnTime: '09:00' }).returnDate).toMatch(/up to 30 days/)
  })

  test('the midnight edge: 00:00 on the next Manila day is after 23:30 the day before', () => {
    const late = { ...base, outboundTime: '23:30' }
    expect(validateReturnInput({ ...late, returnDate: '2026-10-06', returnTime: '00:00' })).toEqual({})
    expect(validateReturnInput({ ...late, returnDate: '2026-10-05', returnTime: '23:30' }).returnTime).toBeTruthy()
  })

  test('malformed or missing input says nothing until it is filled in', () => {
    expect(validateReturnInput({ ...base, returnDate: '', returnTime: '' })).toEqual({})
    expect(validateReturnInput({ ...base, returnDate: '10/06/2026', returnTime: '09:00' }).returnDate).toBeTruthy()
  })
})

describe('roundtripPayState', () => {
  const legs = { outbound: { fare: 46.75 }, return: { fare: 46.75 } }
  test('payable only when the server says so and both legs exist', () => {
    expect(roundtripPayState({ can_pay: true, total_fare: 93.5, ...legs })).toEqual({ canPay: true, blockedReason: '', total: 93.5 })
    expect(roundtripPayState({ can_pay: true, total_fare: 93.5, outbound: legs.outbound, return: null }).canPay).toBe(false)
  })

  test('otherwise it carries the server\'s reason and no total', () => {
    expect(roundtripPayState({ can_pay: false, message: 'No return departure matches.', outbound: legs.outbound, return: null }))
      .toEqual({ canPay: false, blockedReason: 'No return departure matches.', total: null })
    expect(roundtripPayState(null)).toEqual({ canPay: false, blockedReason: '', total: null })
  })
})

describe('buildRoundtripItems', () => {
  const data = {
    outbound: { trip_id: 11, trip_date: '2026-10-05', origin_stop_id: 2, destination_stop_id: 4, journey_leg: 'outbound' },
    return: { trip_id: 12, trip_date: '2026-10-06', origin_stop_id: 4, destination_stop_id: 2, journey_leg: 'return' },
  }

  test('one outbound and one return item per passenger, each with its own trip, stops and date, and no fare', () => {
    const items = buildRoundtripItems({ data, seatType: 'seated', quantity: 2 })
    expect(items).toHaveLength(4)
    expect(items.filter((i) => i.journey_leg === 'outbound')).toHaveLength(2)
    expect(items[0]).toEqual({ trip_id: 11, seat_type: 'seated', origin_stop_id: 2, destination_stop_id: 4, booking_date: '2026-10-05', journey_leg: 'outbound' })
    expect(items[3]).toEqual({ trip_id: 12, seat_type: 'seated', origin_stop_id: 4, destination_stop_id: 2, booking_date: '2026-10-06', journey_leg: 'return' })
    expect(JSON.stringify(items)).not.toMatch(/amount|fare/)
  })
})

describe('legBusText', () => {
  test('shows the leg\'s own label, else that the bus is still to be assigned; never a plate', () => {
    expect(legBusText({ bus_state: 'ready', bus_label: 'Co B - 202', plate_number: 'XYZ' })).toBe('Co B - 202')
    expect(legBusText({ bus_state: 'label_unavailable', bus_label: null })).toBe('Bus to be assigned')
    expect(legBusText(undefined)).toBe('Bus to be assigned')
  })
})
