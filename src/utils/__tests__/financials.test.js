import { describe, expect, it } from 'vitest';
import { csvFileName, filtersToParams, formatPaidAt, formatPeso, paymentFilterPatch, paymentFilterValue, presetRange } from '../financials';

describe('financial page helpers', () => {
  it('formats pesos and the Manila time the server sends, without shifting the day', () => {
    expect(formatPeso(1234.5)).toMatch(/1,234\.50/);
    expect(formatPaidAt('2026-10-05 06:04:44')).toBe('Oct 5, 2026 06:04');
    expect(formatPaidAt('')).toBe('');
  });

  it('builds the quick ranges from the Manila business date', () => {
    expect(presetRange('today', '2026-10-05')).toEqual({ from: '2026-10-05', to: '2026-10-05' });
    expect(presetRange('yesterday', '2026-10-01')).toEqual({ from: '2026-09-30', to: '2026-09-30' });
    expect(presetRange('last7', '2026-10-05')).toEqual({ from: '2026-09-29', to: '2026-10-05' });
    expect(presetRange('month', '2026-10-17')).toEqual({ from: '2026-10-01', to: '2026-10-17' });
  });

  it('maps the Payment select to the server filters and back', () => {
    expect(paymentFilterPatch('method:cash')).toEqual({ payment_method: 'cash', channel: '' });
    expect(paymentFilterPatch('channel:gcash')).toEqual({ payment_method: '', channel: 'gcash' });
    expect(paymentFilterPatch('')).toEqual({ payment_method: '', channel: '' });
    expect(paymentFilterValue({ payment_method: 'cash', channel: '' })).toBe('method:cash');
    expect(paymentFilterValue({ payment_method: '', channel: 'maya' })).toBe('channel:maya');
  });

  it('sends only the filters that are set', () => {
    expect(filtersToParams({ from: '2026-10-05', to: '2026-10-05', route_id: '', fleet_id: '3' }, { page: 2 })).toEqual({ from: '2026-10-05', to: '2026-10-05', fleet_id: '3', page: 2 });
  });

  it('names the CSV from its type and range', () => {
    expect(csvFileName('transactions', { from: '2026-10-05', to: '2026-10-05' })).toBe('financial-transactions-2026-10-05.csv');
    expect(csvFileName('daily', { from: '2026-10-01', to: '2026-10-05' })).toBe('financial-daily-2026-10-01_to_2026-10-05.csv');
  });
});
