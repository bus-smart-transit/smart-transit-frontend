import { describe, expect, it } from 'vitest';
import { busEtaSummary, etaMinutesLabel } from '../busEta';

const now = Date.parse('2026-10-29T10:00:00+08:00');
const stop = (id, name, progress, eta, source = 'live') => ({
  stop_id: id, name, progress, eta_time: eta ? eta.slice(11, 16) : null, eta: eta ? `${eta}+08:00` : null, eta_source: eta ? source : null, custom: false,
});
const timeline = {
  stops: [
    stop(1, 'Tagum Terminal', 'passed', '2026-10-29T09:40:00'),
    stop(2, 'Carmen', 'current', '2026-10-29T10:06:00'),
    stop(3, 'Panabo Market', 'upcoming', '2026-10-29T10:25:00'),
  ],
};

describe('busEtaSummary', () => {
  it('gives the stop the bus is heading to and the final stop, in minutes from now', () => {
    const eta = busEtaSummary(timeline, now);

    expect(eta.next).toMatchObject({ name: 'Carmen', time: '10:06', minutes: 6, live: true });
    expect(eta.destination).toMatchObject({ name: 'Panabo Market', minutes: 25 });
    expect(eta.nearYou).toBeNull();
  });

  it('gives the stop near the passenger, and says when the bus has passed it', () => {
    expect(busEtaSummary(timeline, now, 3).nearYou).toMatchObject({ name: 'Panabo Market', passed: false });
    expect(busEtaSummary(timeline, now, 1).nearYou).toMatchObject({ name: 'Tagum Terminal', passed: true });
  });

  it('uses the first stop not passed when no stop is marked current, and nothing when there are no stops', () => {
    const before = { stops: [stop(1, 'Tagum Terminal', 'upcoming', '2026-10-29T10:30:00', 'scheduled')] };

    expect(busEtaSummary(before, now).next).toMatchObject({ name: 'Tagum Terminal', minutes: 30, live: false });
    expect(busEtaSummary({ stops: [] }, now)).toBeNull();
  });

  it('labels the minutes', () => {
    expect(etaMinutesLabel(6)).toBe('in 6 min');
    expect(etaMinutesLabel(0)).toBe('due now');
    expect(etaMinutesLabel(null)).toBe('');
  });
});
