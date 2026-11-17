import { describe, expect, it } from 'vitest';
import { busLine, etaBand, etaText, updatedText } from '../stopArrivals';

// SAMPLE arrivals, shaped like the server's StopArrivalsService.
describe('stopArrivals (Batch 77)', () => {
  it('puts each bus in an ETA band, with delayed first', () => {
    expect(etaBand({ eta_minutes: 3 }).label).toBe('Arriving');
    expect(etaBand({ eta_minutes: 5 }).label).toBe('Arriving');
    expect(etaBand({ eta_minutes: 6 }).label).toBe('Approaching');
    expect(etaBand({ eta_minutes: 15 }).label).toBe('Approaching');
    expect(etaBand({ eta_minutes: 16 }).label).toBe('Expected later');
    expect(etaBand({ eta_minutes: 2, delayed: true }).label).toBe('Delayed');
    expect(etaBand({}).label).toBe('Not provided');
  });

  it('says the minutes, or Now at the stop', () => {
    expect(etaText({ eta_minutes: 8 })).toBe('8 min');
    expect(etaText({ eta_minutes: 0 })).toBe('Now');
    expect(etaText({})).toBe('Not provided');
  });

  it('names a bus by company and body number, never making one up', () => {
    expect(busLine({ bus_company: 'Sample Lines', body_no: '1024' })).toBe('Sample Lines – 1024');
    expect(busLine({ bus_label: 'Sample Lines / 7' })).toBe('Sample Lines / 7');
    expect(busLine({})).toBe('Not provided');
  });

  it('says how fresh the answer is', () => {
    const at = '2026-10-05T07:00:00+08:00';
    expect(updatedText(at, Date.parse(at) + 20000)).toBe('Last updated just now');
    expect(updatedText(at, Date.parse(at) + 125000)).toBe('Last updated 2 min ago');
    expect(updatedText(null)).toBe('');
  });
});
