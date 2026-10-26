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

  it('asks for acceptance before pairing or starting (the shift and the key unlock after accepting)', () => {
    expect(shiftActionReason({ label: 'Start Shift', disabled: true, isPaired: false, hasWork: true, needsAcceptance: true })).toMatch(/Accept your assignment first/);
    expect(shiftActionReason({ label: 'Start Shift', disabled: true, isPaired: false, hasWork: true, needsAcceptance: false })).toMatch(/Pairing is required/);
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
  it('says when Start Boarding and Depart open, and asks for the final stop (Phase A)', () => {
    const base = { isPaired: true, hasOpenShift: true };
    expect(driverTripActionReason({ ...base, status: 'scheduled', boardingLabel: 'Start Boarding opens at 7:30 AM' })).toBe('Start Boarding opens at 7:30 AM.');
    expect(driverTripActionReason({ ...base, status: 'boarding', departLabel: 'Depart opens at 8:00 AM' })).toBe('Boarding is open. Depart opens at 8:00 AM.');
    expect(driverTripActionReason({ ...base, status: 'departed', finalStopDone: false })).toMatch(/Acknowledge the final stop/);
    expect(driverTripActionReason({ ...base, status: 'departed', finalStopDone: true })).toMatch(/Use End Trip/);
  });
});
