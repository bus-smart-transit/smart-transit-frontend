import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('../../../api/StaffService/StaffBaseService', () => ({
  default: { changePassword: vi.fn(), skipPasswordPrompt: vi.fn() },
}));

import StaffBaseService from '../../../api/StaffService/StaffBaseService';
import StaffCalendar from '../StaffCalendar';
import AssignCrewModal from '../Operator/AssignCrewModal';
import FirstPasswordPrompt from '../../Account/FirstPasswordPrompt';
import ChangePasswordSection from '../../Account/ChangePasswordSection';

// Batch 46 phases 5 to 7: password change, the "Assign crew" dialog, and the Operator's calendar day pop-up.

const calendarService = () => ({
  getCalendarDays: vi.fn(async () => ({ data: { days: [{ date: '2026-10-05', trips: 1, shifts: 0 }] } })),
  getCalendarDay: vi.fn(async ({ date }) => ({
    data: { date, items: [{ type: 'trip', trip_id: 41, departure_time: '08:00:00', status: 'scheduled', route_name: 'Route A', origin: 'Alpha', destination: 'Beta', role: 'operator' }], page: 1, per_page: 10, total: 1, last_page: 1 },
  })),
});

beforeEach(() => vi.clearAllMocks());
afterEach(() => { vi.useRealTimers(); cleanup(); });

describe('Operator calendar day pop-up', () => {
  it('opens a day in a pop-up (no card below), and a trip in it opens the Trips view', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-02T04:00:00Z'));
    const onOpenTrip = vi.fn();
    render(<StaffCalendar service={calendarService()} onOpenTrip={onOpenTrip} />);

    expect(screen.queryByRole('region', { name: /Trips on/ })).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: /October 5, 2026/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Trips for the day' });
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Open trip #41 in Trips' }));

    expect(onOpenTrip).toHaveBeenCalledWith(expect.objectContaining({ trip_id: 41 }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps the day card below for the crew calendars', async () => {
    render(<StaffCalendar service={calendarService()} initialDate="2026-10-05" />);
    expect(await screen.findByText(/Alpha → Beta/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: /Open trip/ })).toBeNull();
  });
});

describe('Assign crew', () => {
  const trip = { trip_id: 9, trip_date: '2026-11-09', departure_time: '08:00:00', driver_id: null, conductor_id: 5, fleet_route: { route: { route_name: 'Tagum - Panabo' } } };
  const drivers = [
    { company_user_id: 1, name: 'Ana', user: { username: 'ana' }, is_available: true },
    { company_user_id: 2, name: 'Ben', user: { username: 'ben' }, is_available: false },
  ];

  it('asks only for the missing role, keeps Not Available people unpickable, and sends the choice', async () => {
    const onAssign = vi.fn();
    render(<AssignCrewModal trip={trip} drivers={drivers} conductors={[]} saving={false} msg="" onClose={vi.fn()} onAssign={onAssign} />);

    expect(screen.queryByLabelText('Chauffeur')).toBeNull();
    expect(screen.getByRole('option', { name: 'Ben (@ben) - Not Available' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Assign crew' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Driver'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign crew' }));
    expect(onAssign).toHaveBeenCalledWith({ driverId: '1', conductorId: '' });
  });
});

describe('staff password', () => {
  it('offers the first-sign-in change once; "Not now" answers it', async () => {
    StaffBaseService.skipPasswordPrompt.mockResolvedValue({});
    const { rerender } = render(<FirstPasswordPrompt profile={{ offer_password_change: false }} />);
    expect(screen.queryByRole('dialog')).toBeNull();

    rerender(<FirstPasswordPrompt profile={{ offer_password_change: true }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    await waitFor(() => expect(StaffBaseService.skipPasswordPrompt).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('checks the new password before sending, and shows the server answer under the current password', async () => {
    StaffBaseService.changePassword.mockRejectedValueOnce(new Error('Your current password is not right.', {
      cause: { response: { data: { errors: { current_password: ['Your current password is not right.'] } } } },
    }));
    render(<ChangePasswordSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'old' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'weak' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));
    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(StaffBaseService.changePassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Strong-pass1' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Strong-pass1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));

    await waitFor(() => expect(StaffBaseService.changePassword).toHaveBeenCalledWith({ currentPassword: 'old', password: 'Strong-pass1', passwordConfirmation: 'Strong-pass1' }));
    expect(await screen.findAllByText('Your current password is not right.')).not.toHaveLength(0);
  });
});
