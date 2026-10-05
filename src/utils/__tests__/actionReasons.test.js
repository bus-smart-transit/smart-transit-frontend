import { describe, expect, it } from 'vitest';
import { driverTripActionReason, shiftActionReason, ticketingReason } from '../actionReasons';

describe('disabled action reasons (Batch 29)', () => {
  it('says nothing when the action is allowed', () => {
    expect(shiftActionReason({ label: 'Start Shift', disabled: false, isPaired: true })).toBe('');
    expect(ticketingReason({ isPaired: true, hasOpenShift: true, hasActiveTrip: true })).toBe('');
    expect(driverTripActionReason({ isPaired: true, hasOpenShift: true, status: 'scheduled' })).toBe('');
  });

  it('explains Start Shift when pairing or an assignment is missing', () => {
    expect(shiftActionReason({ label: 'Start Shift', disabled: true, isPaired: false, hasWork: true })).toMatch(/Pairing is required/);
    expect(shiftActionReason({ label: 'Start Shift', disabled: true, isPaired: true, hasWork: false })).toMatch(/nothing to start/);
  });

  it('passes the server reason through for End Shift and explains End Trip', () => {
    expect(shiftActionReason({ label: 'End Shift', disabled: true, isPaired: true, endBlockedReason: 'Finish leg 3 first.' })).toBe('Finish leg 3 first.');
    expect(shiftActionReason({ label: 'End Trip', disabled: true, isPaired: true, tripIsLive: false })).toMatch(/unlocks once the trip has departed/);
  });

  it('gives the first missing step for ticketing', () => {
    expect(ticketingReason({ isPaired: false, hasOpenShift: false, hasActiveTrip: false })).toMatch(/Pairing/);
    expect(ticketingReason({ isPaired: true, hasOpenShift: false, hasActiveTrip: true })).toMatch(/Start your shift/);
    expect(ticketingReason({ isPaired: true, hasOpenShift: true, hasActiveTrip: false })).toMatch(/no active trip/);
    expect(ticketingReason({ isPaired: true, hasOpenShift: true, hasActiveTrip: true, isFull: true })).toMatch(/no places left/);
  });

  it('explains the Driver quick actions by trip status', () => {
    expect(driverTripActionReason({ isPaired: true, hasOpenShift: false, status: 'scheduled' })).toMatch(/Start your shift/);
    expect(driverTripActionReason({ isPaired: true, hasOpenShift: true, status: 'boarding' })).toMatch(/Depart/);
    expect(driverTripActionReason({ isPaired: true, hasOpenShift: true, status: 'in-progress' })).toMatch(/End Trip/);
    expect(driverTripActionReason({ isPaired: true, hasOpenShift: true, status: 'completed' })).toMatch(/already finished/);
  });
});
