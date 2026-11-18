import { describe, expect, it } from 'vitest';
import { busLine, busParts, etaBand, etaText, expectedAndEta, updatedText } from '../stopArrivals';

// SAMPLE arrivals, shaped like the server's StopArrivalsService.
describe('stopArrivals (Batch 77)', () => {
  it('puts each bus in an ETA band, with delayed first', () => {
    expect(etaBand({ eta_minutes: 3 }).label).toBe('Arriving');
    expect(etaBand({ eta_minutes: 5 }).label).toBe('Arriving');
    expect(etaBand({ eta_minutes: 6 }).label).toBe('Approaching');
    expect(etaBand({ eta_minutes: 15 }).label).toBe('Approaching');
    expect(etaBand({ eta_minutes: 16 }).label).toBe('Expected later');
    expect(etaBand({ eta_minutes: 2, delayed: true }).label).toBe('Delayed');
    expect(etaBand({ eta_minutes: 2, delayed: true, late_by_minutes: 7 }).label).toBe('Delayed +7 min');
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
    expect(busParts({ bus_company: 'A Very Long Sample Bus Company Name', body_no: 'DMS-06' })).toEqual({ title: 'DMS-06', subtitle: 'A Very Long Sample Bus Company Name' });
    expect(busParts({ bus_label: 'Sample Lines / 7' })).toEqual({ title: 'Sample Lines / 7', subtitle: null });
    expect(expectedAndEta({ scheduled_time: '12:39', eta_time: '12:45' })).toBe('Expected 12:39 PM · ETA 12:45 PM');
    expect(expectedAndEta({ eta_time: '00:05' })).toBe('ETA 12:05 AM');
    expect(expectedAndEta({})).toBe('Not provided');
    expect(busLine({})).toBe('Not provided');
  });

  it('says how fresh the answer is', () => {
    const at = '2026-10-05T07:00:00+08:00';
    expect(updatedText(at, Date.parse(at) + 20000)).toBe('Last updated just now');
    expect(updatedText(at, Date.parse(at) + 125000)).toBe('Last updated 2 min ago');
    expect(updatedText(null)).toBe('');
  });
});
