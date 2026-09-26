import { describe, expect, it } from 'vitest';
import { buildCalendarGrid } from '../calendarGrid';

// S4 (Batch 17): buildCalendarGrid was extracted out of useDriverDashboard.js
// so both Driver and Conductor calendar tabs share one implementation
// (previously Driver-only, per Batch 15 Item 5). This locks in the grid
// shape/behavior for both consumers.
describe('buildCalendarGrid', () => {
  it('produces a 42-cell grid starting on Sunday and buckets trips by date', () => {
    const monthDate = new Date(2026, 8, 1); // September 2026 (Tue 1st)
    const tripsByDate = {
      '2026-09-05': [{ trip_id: 1, status: 'scheduled' }],
      '2026-09-05_ignored': [{ trip_id: 99 }],
    };

    const grid = buildCalendarGrid(monthDate, tripsByDate);

    expect(grid).toHaveLength(42);
    expect(grid[0].date.getDay()).toBe(0); // first cell is a Sunday

    const sep5 = grid.find((cell) => cell.dateKey === '2026-09-05');
    expect(sep5).toBeTruthy();
    expect(sep5.isCurrentMonth).toBe(true);
    expect(sep5.trips).toHaveLength(1);
    expect(sep5.trips[0].trip_id).toBe(1);

    const emptyDay = grid.find((cell) => cell.dateKey === '2026-09-06');
    expect(emptyDay.trips).toEqual([]);
  });

  it('marks leading/trailing days from adjacent months as not-current-month', () => {
    const monthDate = new Date(2026, 8, 1);
    const grid = buildCalendarGrid(monthDate, {});

    const leadingDay = grid[0];
    expect(leadingDay.date.getMonth()).not.toBe(8);
    expect(leadingDay.isCurrentMonth).toBe(false);
  });
});
