import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../api/StaffService/StaffBaseService', () => ({
  default: { stepUpVerifyPassword: vi.fn() },
}));

import StaffService from '../../api/StaffService/StaffBaseService';
import StepUpModal from './StepUpModal';

describe('StepUpModal', () => {
  beforeEach(() => vi.clearAllMocks());

  test('renders nothing when closed', () => {
    render(<StepUpModal open={false} onClose={vi.fn()} onVerified={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('keeps Confirm disabled until a password is typed', () => {
    render(<StepUpModal open onClose={vi.fn()} onVerified={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Confirm' }).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    expect(screen.getByRole('button', { name: 'Confirm' }).disabled).toBe(false);
  });

  test('hands the token and lifetime to onVerified on success', async () => {
    StaffService.stepUpVerifyPassword.mockResolvedValue({ data: { step_up_token: 'tok123', expires_in: 900 } });
    const onVerified = vi.fn();
    render(<StepUpModal open onClose={vi.fn()} onVerified={onVerified} />);

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(onVerified).toHaveBeenCalledWith({ token: 'tok123', expiresIn: 900 }));
    expect(StaffService.stepUpVerifyPassword).toHaveBeenCalledWith('secret');
  });

  test('shows the error and clears the field on a wrong password', async () => {
    StaffService.stepUpVerifyPassword.mockRejectedValue(new Error('Incorrect password.'));
    const onVerified = vi.fn();
    render(<StepUpModal open onClose={vi.fn()} onVerified={onVerified} />);

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Incorrect password.');
    expect(screen.getByLabelText('Password').value).toBe('');
    expect(onVerified).not.toHaveBeenCalled();
  });

  test('Cancel calls onClose', () => {
    const onClose = vi.fn();
    render(<StepUpModal open onClose={onClose} onVerified={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
