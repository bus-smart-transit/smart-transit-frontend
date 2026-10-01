import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import DashboardCalendar from '../DashboardCalendar';
import StaffCalendar from '../StaffCalendar';

const item = (id, time, over = {}) => ({
  type: 'trip', trip_id: id, shift_block_id: null, departure_time: `${time}:00`, status: 'scheduled', route_name: 'Route A',
  origin: 'Alpha', destination: 'Beta', leg_direction: 'outbound', plate_number: `PL-${id}`, role: 'driver', ...over,
});

function makeService() {
  return {
    getCalendarDays: vi.fn(async () => ({ data: { days: [{ date: '2026-10-05', trips: 3, shifts: 1 }] } })),
    getCalendarDay: vi.fn(async ({ date, page = 1 }) => ({
      data: {
        date,
        items: page === 1 ? [item(1, '06:00'), item(2, '09:30', { origin: 'Beta', destination: 'Alpha', leg_direction: 'reverse', type: 'shift' })] : [item(3, '14:00', { role: 'conductor' })],
        page, per_page: 2, total: 3, last_page: 2,
      },
    })),
  };
}

describe('calendar widget and full calendar', () => {
  beforeEach(() => {
    // 2026-10-02 12:00 in Manila
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-02T04:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('widget: asks the server for the 6-week grid of the month on screen, marks days with items and pages months', async () => {
    const service = makeService();
    render(<DashboardCalendar service={service} onOpenFull={vi.fn()} />);

    // October 2026 starts on a Thursday: the grid runs 2026-09-27 to 2026-11-07.
    await waitFor(() => expect(service.getCalendarDays).toHaveBeenCalledWith({ from: '2026-09-27', to: '2026-11-07' }));
    expect(await screen.findByRole('button', { name: /October 5, 2026, 3 trips, 1 shift/ })).toBeInTheDocument();
    expect(screen.getByText('October 2026')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { pressed: false }).length).toBe(42);

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    await waitFor(() => expect(service.getCalendarDays).toHaveBeenLastCalledWith({ from: '2026-11-01', to: '2026-12-12' }));
  });

  it('widget: a day opens a modal with only that day, paginated, with the leg direction and role; Esc closes', async () => {
    const service = makeService();
    render(<DashboardCalendar service={service} onOpenFull={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /October 5, 2026/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Schedule for the day' });
    await waitFor(() => expect(service.getCalendarDay).toHaveBeenCalledWith({ date: '2026-10-05', page: 1 }));
    expect(await within(dialog).findByRole('heading', { name: /Monday, October 5, 2026/ })).toBeInTheDocument();
    expect(within(dialog).getByText('3 items')).toBeInTheDocument();
    expect(within(dialog).getByText(/Alpha → Beta/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Beta → Alpha/)).toBeInTheDocument(); // the return leg reads in its own direction
    expect(within(dialog).getByText(/Shift leg/)).toBeInTheDocument();
    expect(within(dialog).getByText(/PL-1 · Driver/)).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(within(dialog).getByRole('button', { name: /next/i }));
    await waitFor(() => expect(service.getCalendarDay).toHaveBeenLastCalledWith({ date: '2026-10-05', page: 2 }));
    expect(await within(dialog).findByText(/PL-3 · Chauffeur/)).toBeInTheDocument();
    expect(within(dialog).getByText('Page 2 of 2')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('widget: an empty day says so, and "Open full schedule" hands that date to the calendar page', async () => {
    const service = makeService();
    service.getCalendarDay.mockResolvedValue({ data: { date: '2026-10-09', items: [], page: 1, per_page: 6, total: 0, last_page: 1 } });
    const onOpenFull = vi.fn();
    render(<DashboardCalendar service={service} onOpenFull={onOpenFull} />);
    fireEvent.click(await screen.findByRole('button', { name: /October 9, 2026/ }));

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Nothing scheduled this day.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /open full schedule/i }));

    expect(onOpenFull).toHaveBeenCalledWith('2026-10-09');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('widget: "Full calendar" opens the calendar page on today (no date)', async () => {
    const onOpenFull = vi.fn();
    render(<DashboardCalendar service={makeService()} onOpenFull={onOpenFull} />);
    fireEvent.click(screen.getByRole('button', { name: /full calendar/i }));
    expect(onOpenFull).toHaveBeenCalledWith(null);
  });

  it('calendar page: opens on the requested day (or today in Manila) and shows the same day list', async () => {
    const service = makeService();
    const { unmount } = render(<StaffCalendar service={service} initialDate="2026-10-05" />);
    expect(await screen.findByRole('heading', { name: /Monday, October 5, 2026/ })).toBeInTheDocument();
    expect(await screen.findByText(/PL-1 · Driver/)).toBeInTheDocument();
    unmount();

    service.getCalendarDay.mockClear();
    render(<StaffCalendar service={service} />);
    await waitFor(() => expect(service.getCalendarDay).toHaveBeenCalledWith({ date: '2026-10-02', page: 1 })); // Friday in Manila
  });

  it('shows the server\'s message when the calendar cannot load', async () => {
    const service = makeService();
    service.getCalendarDays.mockRejectedValue(new Error('The calendar could not be loaded.'));
    render(<DashboardCalendar service={service} onOpenFull={vi.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('The calendar could not be loaded.');
    expect(screen.getAllByRole('button', { pressed: false }).length).toBe(42); // still a full grid, same size
  });
});
