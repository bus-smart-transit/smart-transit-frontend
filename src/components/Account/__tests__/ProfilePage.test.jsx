import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ProfilePage from '../ProfilePage';

const staff = (over = {}) => ({ company_user_id: 7, name: 'Dina Driver', phone_num: '09000000003', address: 'Some street', birth_date: '1990-01-01', is_available: true, user: { email: 'd@example.test', two_factor_enabled: false, created_at: '2026-10-10T03:12:52.000000Z' }, ...over });
const passenger = (over = {}) => ({ name: 'Pia Passenger', phone_num: '09100000001', address: 'Tagum City', reward_points: 12, passenger_uuid: '1a2b3c4d-1111-2222-3333-444455556666', user: { email: 'p@example.test' }, ...over });

describe('ProfilePage', () => {
  it('shows a loading state, then an error with a way to try again', () => {
    const { rerender } = render(<ProfilePage role="driver" profile={null} loading onSignOut={() => {}} />);
    expect(screen.getByTestId('profile-loading')).toBeInTheDocument();

    const retry = vi.fn();
    rerender(<ProfilePage role="driver" profile={null} loading={false} error="" onRetry={retry} onSignOut={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('We could not load your profile');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('Passenger: personal details, passenger ID, rewards, extra login code and sign out; nothing is editable yet', () => {
    const toggle = vi.fn();
    const signOut = vi.fn();
    render(<ProfilePage role="passenger" profile={passenger()} twoFactor={{ enabled: true, saving: false, message: 'Saved', onChange: toggle }} onSignOut={signOut} />);

    expect(screen.getByTestId('profile-role')).toHaveTextContent('Passenger');
    expect(screen.getByTestId('field-name')).toHaveTextContent('Pia Passenger');
    expect(screen.getByTestId('field-address')).toHaveTextContent('Tagum City');
    expect(screen.getByTestId('field-identification')).toHaveTextContent('1A2B3C4D');
    expect(screen.getByTestId('field-rewards')).toHaveTextContent('12 points');
    expect(screen.queryByTestId('locked-note')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByTestId('profile-preferences')).not.toBeInTheDocument();

    const sw = within(screen.getByTestId('profile-security')).getByRole('switch');
    expect(sw).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(sw);
    expect(toggle).toHaveBeenCalledWith(false);
    expect(screen.getByRole('status')).toHaveTextContent('Saved');

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(signOut).toHaveBeenCalled();
  });

  it('Driver: staff ID, today\'s fleet, locked details with the note, availability, and no address or birth date', () => {
    const availability = vi.fn();
    render(
      <ProfilePage
        role="driver"
        profile={staff()}
        twoFactor={{ enabled: false, saving: false, message: '', onChange: () => {} }}
        availability={{ value: true, saving: false, onChange: availability }}
        assignment={{ route: 'Tagum - Panabo', fleet: 'DEMO-101' }}
        onSignOut={() => {}}
      />,
    );
    expect(screen.getByTestId('profile-role')).toHaveTextContent('Driver');
    expect(screen.getByTestId('field-identification')).toHaveTextContent('Staff ID');
    expect(screen.getByTestId('field-identification')).toHaveTextContent('7');
    expect(screen.getByTestId('field-fleet')).toHaveTextContent('DEMO-101');
    expect(screen.getByTestId('field-route')).toHaveTextContent('Tagum - Panabo');
    expect(screen.getByTestId('locked-note')).toHaveTextContent('contact your operator');
    expect(screen.queryByTestId('field-address')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('Some street');
    expect(document.body).not.toHaveTextContent('1990');
    expect(within(screen.getByTestId('field-name')).getByText('(read only)')).toBeInTheDocument();

    fireEvent.click(within(screen.getByTestId('profile-preferences')).getByRole('switch'));
    expect(availability).toHaveBeenCalledWith(false);
  });

  it('Chauffeur: shows the Chauffeur label, "Not provided" for a missing phone and "None today" with no assignment', () => {
    render(<ProfilePage role="conductor" profile={staff({ phone_num: '' })} assignment={{ route: null, fleet: null }} twoFactor={{ enabled: true, onChange: () => {} }} onSignOut={() => {}} />);
    expect(screen.getByTestId('profile-role')).toHaveTextContent('Chauffeur');
    expect(screen.getByTestId('field-phone')).toHaveTextContent('Not provided');
    expect(screen.getByTestId('field-fleet')).toHaveTextContent('None today');
    expect(screen.getByTestId('field-route')).toHaveTextContent('None today');
  });

  it('hides Preferences when availability is not known, so there is no control that does nothing', () => {
    render(<ProfilePage role="driver" profile={staff()} availability={{ value: undefined, onChange: () => {} }} onSignOut={() => {}} />);
    expect(screen.queryByTestId('profile-preferences')).not.toBeInTheDocument();
    expect(screen.queryByTestId('profile-security')).not.toBeInTheDocument();
  });

  it('Operator: company ID, always-on extra login code with no switch, and the administrator note', () => {
    render(<ProfilePage role="operator" profile={staff({ user: { email: 'o@example.test', two_factor_enabled: true } })} onSignOut={() => {}} />);
    expect(screen.getByTestId('profile-role')).toHaveTextContent('Operator');
    expect(screen.getByTestId('field-identification')).toHaveTextContent('Company ID');
    expect(within(screen.getByTestId('profile-security')).getByText('Always on')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByTestId('locked-note')).toHaveTextContent('system administrator');
    expect(screen.queryByTestId('field-fleet')).not.toBeInTheDocument();
  });

  it('a disabled switch while saving', () => {
    render(<ProfilePage role="passenger" profile={passenger()} twoFactor={{ enabled: false, saving: true, onChange: () => {} }} onSignOut={() => {}} />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });
});

// 2026-10-29 (Batch 36 Phase 2): a passenger edits their own name, phone and gender.
describe('ProfilePage passenger edit', () => {
  it('opens a form, saves the trimmed name, phone and gender and shows the result', async () => {
    const save = vi.fn().mockResolvedValue({ ok: true, message: 'Your profile was saved.' });
    render(<ProfilePage role="passenger" profile={passenger({ gender: 'female' })} onSaveProfile={save} onSignOut={() => {}} />);

    fireEvent.click(screen.getByTestId('profile-edit'));
    const name = screen.getByLabelText(/Name/);
    expect(name).toHaveValue('Pia Passenger');
    expect(screen.getByLabelText('Gender')).toHaveValue('female');
    fireEvent.change(name, { target: { value: '  Ana Reyes ' } });
    fireEvent.change(screen.getByLabelText(/Phone/), { target: { value: '0917 123 4567' } });
    fireEvent.change(screen.getByLabelText('Gender'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByTestId('profile-edit-result')).toHaveTextContent('Your profile was saved.');
    expect(save).toHaveBeenCalledWith({ name: 'Ana Reyes', phone_num: '0917 123 4567', gender: null });
    expect(screen.queryByTestId('profile-edit-form')).not.toBeInTheDocument();
  });

  it('keeps the form open and shows the reason when saving fails', async () => {
    const save = vi.fn().mockResolvedValue({ ok: false, message: 'Enter a valid phone number.' });
    render(<ProfilePage role="passenger" profile={passenger()} onSaveProfile={save} onSignOut={() => {}} />);

    fireEvent.click(screen.getByTestId('profile-edit'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid phone number.');
    expect(screen.getByTestId('profile-edit-form')).toBeInTheDocument();
  });

  it('does not send an empty name, and Cancel goes back without saving', () => {
    const save = vi.fn();
    render(<ProfilePage role="passenger" profile={passenger()} onSaveProfile={save} onSignOut={() => {}} />);

    fireEvent.click(screen.getByTestId('profile-edit'));
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: ' ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your full name.');
    expect(save).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByTestId('field-name')).toHaveTextContent('Pia Passenger');
  });

  it('shows no Edit button to staff, even if a save handler is passed', () => {
    render(<ProfilePage role="driver" profile={staff()} onSaveProfile={vi.fn()} onSignOut={() => {}} />);
    expect(screen.queryByTestId('profile-edit')).not.toBeInTheDocument();
  });
});
