import { getBusinessToday } from './dates';

// Batch 15, Item 5 (Driver) / Batch 17, S4 (extended to Conductor): builds a
// 6-row (42-cell) month grid starting on Sunday, including the trailing/
// leading days from adjacent months needed to fill whole weeks — a standard
// calendar-grid layout. `tripsByDate` maps a 'YYYY-MM-DD' key to the trips
// scheduled that day. Shared by both dashboards' calendar tabs so the grid
// logic itself only exists in one place.
// Batch 81 (user, 2026-11-19): with { fit: true } the grid has only the weeks the month needs (4 to 6 rows, usually 5)
// instead of always 6; the dashboard's small calendar uses it.
export function buildCalendarGrid(monthDate, tripsByDate, { fit = false } = {}) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startOffset);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const length = fit ? Math.ceil((startOffset + daysInMonth) / 7) * 7 : 42;

  return Array.from({ length }, (_, i) => {
    const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const dateKey = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
    return {
      date: cellDate,
      dateKey,
      isCurrentMonth: cellDate.getMonth() === month,
      isToday: dateKey === getBusinessToday(),
      trips: tripsByDate[dateKey] || [],
    };
  });
}
