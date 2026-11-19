import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DeleteAccountSection from '../DeleteAccountSection';
import ProfilePage from '../ProfilePage';

const passenger = { name: 'Pia Passenger', phone_num: '09100000001', address: 'Tagum City', reward_points: 12, passenger_uuid: '1a2b3c4d-1111-2222-3333-444455556666', user: { email: 'p@example.test' } };
const staff = { company_user_id: 7, name: 'Dina Driver', phone_num: '09000000003', address: 'Some street', user: { email: 'd@example.test' } };

describe('DeleteAccountSection', () => {
  it('asks for the password and a ticked box before it deletes, then sends only the password', async () => {
    const onDelete = vi.fn().mockResolvedValue({ ok: true, message: '' });
    render(<DeleteAccountSection onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    const submit = screen.getByRole('button', { name: 'Delete my account' });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Enter your password'), { target: { value: 'secret-pass-1' } });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(submit).toBeEnabled();

    fireEvent.click(submit);
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('secret-pass-1'));
  });

  it("shows the server's reason when the account cannot be deleted yet", async () => {
    const onDelete = vi.fn().mockResolvedValue({ ok: false, message: 'You still have a ticket for a trip that has not happened yet.' });
    render(<DeleteAccountSection onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    fireEvent.change(screen.getByLabelText('Enter your password'), { target: { value: 'secret-pass-1' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('You still have a ticket for a trip that has not happened yet.');
  });

  it('can be closed without deleting anything', () => {
    const onDelete = vi.fn();
    render(<DeleteAccountSection onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep my account' }));

    expect(screen.queryByTestId('delete-account-form')).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('appears on the passenger profile only, never on a staff profile', () => {
    const { rerender } = render(<ProfilePage role="passenger" profile={passenger} onSignOut={() => {}} onDeleteAccount={vi.fn()} />);
    expect(screen.getByTestId('delete-account')).toBeInTheDocument();

    rerender(<ProfilePage role="driver" profile={staff} onSignOut={() => {}} onDeleteAccount={vi.fn()} />);
    expect(screen.queryByTestId('delete-account')).not.toBeInTheDocument();
  });
});
