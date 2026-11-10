import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import CalendarSummaryStrip from '../CalendarSummaryStrip';

// Batch 54 (production test): the counts read "1 trip", not "1 trips".
describe('CalendarSummaryStrip', () => {
  test('says one trip and one shift in the singular, other counts in the plural', async () => {
    const service = {
      getCalendarSummary: vi.fn().mockResolvedValue({
        data: { today: { date: '2026-11-10', trips: 1, shifts: 1 }, week: { start: '2026-11-08', end: '2026-11-14', trips: 2, shifts: 0 }, next: null },
      }),
    };
    render(<CalendarSummaryStrip service={service} />);
    expect(await screen.findByText('1 trip · 1 shift')).toBeInTheDocument();
    expect(screen.getByText('2 trips · 0 shifts')).toBeInTheDocument();
  });
});
