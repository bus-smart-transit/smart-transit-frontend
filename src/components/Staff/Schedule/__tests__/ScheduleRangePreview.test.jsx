import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import ScheduleRangePreview from '../ScheduleRangePreview';

const preview = {
  from_date: '2026-10-07', to_date: '2026-10-09', create_count: 2, skip_count: 1,
  days: [
    { date: '2026-10-07', ok: true, reason: null },
    { date: '2026-10-08', ok: false, reason: 'This driver already has a shift block scheduled for this date.' },
    { date: '2026-10-09', ok: true, reason: null },
  ],
};

describe('ScheduleRangePreview', () => {
  test('lists every day with what will happen, and saves nothing until confirmed', () => {
    const onConfirm = vi.fn();
    render(<ScheduleRangePreview preview={preview} saving={false} onConfirm={onConfirm} />);

    expect(screen.getByText(/2 of 3 days can be scheduled/)).toBeTruthy();
    const rows = screen.getAllByTestId('range-day').map((row) => row.textContent);
    expect(rows).toEqual([
      'Wed, Oct 7Will be scheduled',
      'Thu, Oct 8Skipped: This driver already has a shift block scheduled for this date.',
      'Fri, Oct 9Will be scheduled',
    ]);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Schedule 2 days' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('disables confirm while a request is out (no double tap) and when no day can be scheduled', () => {
    const { rerender } = render(<ScheduleRangePreview preview={preview} saving onConfirm={() => {}} />);
    expect(screen.getByRole('button', { name: /Schedule 2 days/ })).toBeDisabled();

    rerender(<ScheduleRangePreview preview={{ ...preview, create_count: 0, days: preview.days.map((d) => ({ ...d, ok: false, reason: 'Busy.' })) }} saving={false} onConfirm={() => {}} />);
    expect(screen.getByRole('button', { name: 'No days to schedule' })).toBeDisabled();
  });

  test('shows the result with the skipped days and their reason', () => {
    const onDone = vi.fn();
    const result = { ...preview, message: '2 days scheduled, 1 skipped', days: preview.days.map((d) => (d.ok ? { ...d, shift_block_id: 1 } : d)) };
    render(<ScheduleRangePreview result={result} onDone={onDone} />);

    expect(screen.getByText('2 days scheduled, 1 skipped')).toBeTruthy();
    expect(screen.getAllByTestId('range-day').map((row) => row.textContent)).toEqual([
      'Wed, Oct 7Scheduled',
      'Thu, Oct 8Skipped: This driver already has a shift block scheduled for this date.',
      'Fri, Oct 9Scheduled',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test('renders nothing without a preview', () => {
    const { container } = render(<ScheduleRangePreview preview={null} onConfirm={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
