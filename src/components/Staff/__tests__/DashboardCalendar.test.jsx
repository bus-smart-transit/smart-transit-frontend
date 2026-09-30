import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import DashboardCalendar from '../DashboardCalendar';
import StaffScheduleView from '../StaffScheduleView';
import { formatTripSchedule, splitSchedule } from '../../../utils/staffSchedule';

const trip = (id, date, time, status = 'scheduled') => ({
  trip_id: id,
  trip_date: date,
  departure_time: time,
  status,
  fleet_route: { route: { origin: 'Ecoland', destination: 'Tagum', route_name: `Route ${id}` }, fleet: { plate_number: `PL-${id}` } },
});

const TRIPS = [
  trip(1, '2026-10-01', '06:00:00', 'completed'),
  trip(2, '2026-10-05', '08:30:00'),
  trip(3, '2026-10-05', '14:00:00'),
  trip(4, '2026-10-20', '09:15:00'),
];

describe('staff schedule', () => {
  beforeEach(() => {
    // 2026-10-02 12:00 in Manila (04:00 UTC)
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-02T04:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('formats trips by their own date and time, and splits upcoming from past by Manila day', () => {
    expect(formatTripSchedule(TRIPS[1])).toBe('2026/10/05 - 08:30');
    const { upcoming, past } = splitSchedule(TRIPS, '2026-10-02');
    expect(upcoming.map((t) => t.trip_id)).toEqual([2, 3, 4]);
    expect(past.map((t) => t.trip_id)).toEqual([1]);
  });

  it('StaffScheduleView lists upcoming and past, and focuses the requested day', () => {
    render(<StaffScheduleView trips={TRIPS} focusDate="2026-10-05" />);
    expect(screen.getByRole('heading', { name: /Monday, October 5, 2026/ })).toBeTruthy();
    const dayList = screen.getByRole('heading', { name: /Monday, October 5, 2026/ }).closest('.staff-card');
    expect(within(dayList).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Upcoming' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Past' })).toBeTruthy();
  });

  it('StaffScheduleView reports the chosen trip', () => {
    const onSelectTrip = vi.fn();
    render(<StaffScheduleView trips={TRIPS} focusDate="2026-10-05" onSelectTrip={onSelectTrip} />);
    const dayList = screen.getByRole('heading', { name: /Monday, October 5, 2026/ }).closest('.staff-card');
    fireEvent.click(within(dayList).getAllByRole('button')[1]);
    expect(onSelectTrip).toHaveBeenCalledWith(TRIPS[2]);
  });

  it('dashboard calendar marks trip days and opens the schedule on the pressed day', () => {
    render(<DashboardCalendar trips={TRIPS} />);
    expect(screen.getByRole('button', { name: '2026-10-05, 2 trips' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '2026-10-05, 2 trips' }));
    const dialog = screen.getByRole('dialog', { name: 'Schedule' });
    expect(within(dialog).getByRole('heading', { name: /Monday, October 5, 2026/ })).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('pressing the card opens the schedule focused on today (Manila)', () => {
    render(<DashboardCalendar trips={TRIPS} />);
    fireEvent.click(screen.getByRole('button', { name: /Open schedule/ }));
    const dialog = screen.getByRole('dialog', { name: 'Schedule' });
    expect(within(dialog).getByRole('heading', { name: /Friday, October 2, 2026/ })).toBeTruthy();
    expect(within(dialog).getByText('No trips scheduled this day.')).toBeTruthy();
  });

  it('picking a trip inside the modal closes it and hands the trip to the dashboard', () => {
    const onSelectTrip = vi.fn();
    render(<DashboardCalendar trips={TRIPS} onSelectTrip={onSelectTrip} />);
    fireEvent.click(screen.getByRole('button', { name: '2026-10-05, 2 trips' }));
    const dialog = screen.getByRole('dialog');
    const dayList = within(dialog).getByRole('heading', { name: /Monday, October 5, 2026/ }).closest('.staff-card');
    fireEvent.click(within(dayList).getAllByRole('button')[0]);
    expect(onSelectTrip).toHaveBeenCalledWith(TRIPS[1]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('traps Tab focus inside the modal', () => {
    render(<DashboardCalendar trips={TRIPS} />);
    fireEvent.click(screen.getByRole('button', { name: /Open schedule/ }));
    const dialog = screen.getByRole('dialog');
    const focusables = [...dialog.querySelectorAll('button:not([disabled])')];
    const last = focusables[focusables.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(focusables[0]);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
