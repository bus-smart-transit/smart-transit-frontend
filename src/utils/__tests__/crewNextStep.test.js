import { describe, expect, it } from 'vitest';
import { chauffeurNextStep, driverNextStep } from '../crewNextStep';

// Batch 61 (advisor, via the user, 2026-11-13): the crew Home's one big button is the next thing to do.
const ready = { hasWork: true, isPaired: true, hasOpenShift: true };

describe('driverNextStep', () => {
  it('walks the day in order: accept, pair, start shift, boarding, depart, each stop, end trip', () => {
    expect(driverNextStep({ hasWork: false }).key).toBe('none');
    expect(driverNextStep({ hasWork: true, needsAcceptance: true, isPaired: false }).label).toBe('Open my trips');
    expect(driverNextStep({ hasWork: true, isPaired: false }).label).toBe('Pair with crew');
    expect(driverNextStep({ hasWork: true, isPaired: true, hasOpenShift: false }).label).toBe('Start shift');
    expect(driverNextStep({ ...ready, tripStatus: 'scheduled' }).label).toBe('Start boarding');
    expect(driverNextStep({ ...ready, tripStatus: 'boarding' }).label).toBe('Depart');
    expect(driverNextStep({ ...ready, tripStatus: 'departed', nextStopName: 'Panabo', nextStopId: 4 })).toMatchObject({ key: 'arrive', label: 'I am at Panabo', disabled: false });
    expect(driverNextStep({ ...ready, tripStatus: 'in-progress', finalStopDone: true }).label).toBe('End trip');
    expect(driverNextStep({ ...ready, tripStatus: 'completed' })).toMatchObject({ key: 'done', label: null });
  });

  it('keeps a step that cannot be done yet, disabled, with the reason', () => {
    const early = driverNextStep({ ...ready, tripStatus: 'scheduled', boardingGate: { open: false, label: 'Start Boarding opens at 06:30' } });
    expect(early).toMatchObject({ key: 'boarding', disabled: true, reason: 'Start Boarding opens at 06:30' });
    const blocked = driverNextStep({ ...ready, showEndShift: true, endBlockedReason: 'Leg 3 is not finished.' });
    expect(blocked).toMatchObject({ key: 'endShift', disabled: true, reason: 'Leg 3 is not finished.' });
    expect(driverNextStep({ ...ready, tripStatus: 'departed' })).toMatchObject({ key: 'arrive', disabled: true });
    expect(driverNextStep({ ...ready, tripStatus: 'boarding', inFlight: true }).disabled).toBe(true);
  });

  it('says it is waiting while a release request is with the Operator', () => {
    expect(driverNextStep({ hasWork: true, forApproval: true })).toMatchObject({ key: 'waiting', label: null });
  });
});

describe('chauffeurNextStep', () => {
  it('ends in scanning tickets, then ending the shift; trip actions stay the Driver\'s', () => {
    expect(chauffeurNextStep({ hasWork: true, isPaired: false }).label).toBe('Pair with crew');
    expect(chauffeurNextStep({ hasWork: true, isPaired: true, hasOpenShift: false }).label).toBe('Start shift');
    expect(chauffeurNextStep({ ...ready, hasActiveTrip: true, tripStatus: 'scheduled' })).toMatchObject({ key: 'wait', label: null });
    expect(chauffeurNextStep({ ...ready, hasActiveTrip: true, tripStatus: 'boarding' }).label).toBe('Scan tickets');
    expect(chauffeurNextStep({ ...ready, hasActiveTrip: false })).toMatchObject({ key: 'endShift', label: 'End shift' });
    expect(chauffeurNextStep({ ...ready, hasActiveTrip: false, endBlockedReason: 'Remit the cash first.' })).toMatchObject({ disabled: true, reason: 'Remit the cash first.' });
  });
});
