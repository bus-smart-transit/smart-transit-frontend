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

// Batch 81 (user, 2026-11-19): the dashboard's small calendar shows only the weeks the month needs.
describe('buildCalendarGrid with fit', () => {
  it('has 5 rows for November 2026, 6 for August 2026 and 4 for February 2026, always whole weeks from Sunday', () => {
    expect(buildCalendarGrid(new Date(2026, 10, 1), {}, { fit: true })).toHaveLength(35); // starts on a Sunday, 30 days
    expect(buildCalendarGrid(new Date(2026, 7, 1), {}, { fit: true })).toHaveLength(42);  // starts on a Saturday, 31 days
    expect(buildCalendarGrid(new Date(2026, 1, 1), {}, { fit: true })).toHaveLength(28);  // starts on a Sunday, 28 days
    const nov = buildCalendarGrid(new Date(2026, 10, 1), {}, { fit: true });
    expect(nov[0].dateKey).toBe('2026-11-01');
    expect(nov.at(-1).dateKey).toBe('2026-12-05');
    expect(buildCalendarGrid(new Date(2026, 10, 1), {})).toHaveLength(42); // the full page keeps 6 rows
  });
});
