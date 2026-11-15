import { describe, expect, it } from 'vitest';
import { journeyLabel, markUnservedStops, servedStopIdsOf } from '../expressTrip';

const nonStop = { type: 'express', non_stop: true, served_stops: [{ stop_id: 4, name: 'Ecoland Terminal' }, { stop_id: 13, name: 'Tagum Terminal' }] };

describe('express trips on the passenger map (Batch 75)', () => {
  it('reads point A to point B, Non-stop for an express serving only its terminals', () => {
    expect(journeyLabel({ origin: 'Ecoland Terminal', destination: 'Tagum Terminal', service: nonStop })).toBe('Ecoland Terminal → Tagum Terminal · Non-stop');
    expect(journeyLabel({ origin: 'Ecoland Terminal', destination: 'Tagum Terminal', service: { type: 'regular' } })).toBe('Ecoland Terminal → Tagum Terminal');
    const someStops = { type: 'express', non_stop: false, served_stops: [{ stop_id: 4, name: 'Ecoland Terminal' }, { stop_id: 11, name: 'Panabo City Terminal' }, { stop_id: 13, name: 'Tagum Terminal' }] };
    expect(journeyLabel({ origin: 'Ecoland Terminal', destination: 'Tagum Terminal', service: someStops })).toBe('Ecoland Terminal → Tagum Terminal · Express, stops at Panabo City Terminal');
    expect(journeyLabel({ origin: null, destination: 'Tagum Terminal' })).toBeNull();
  });

  it('draws the stops an express skips as pass-through dots, and leaves a regular trip alone', () => {
    const stops = [{ stopId: 4, type: 'stop' }, { stopId: 6, type: 'stop' }, { stopId: 13, type: 'stop' }];
    expect(markUnservedStops(stops, servedStopIdsOf(nonStop)).map((s) => s.type)).toEqual(['stop', 'pass_through', 'stop']);
    expect(markUnservedStops(stops, servedStopIdsOf({ type: 'regular' }))).toBe(stops);
  });
});
