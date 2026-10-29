import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const service = vi.hoisted(() => ({
  login: vi.fn(),
  verifyOtp: vi.fn(),
  resendVerification: vi.fn().mockResolvedValue({}),
}));
vi.mock('../../../api/PassengerService/PassengerService', () => ({ default: service }));
vi.mock('../../../api/hooks/useAuth', () => ({ useAuth: () => ({ login: vi.fn() }) }));

import LoginPage from './LoginPage';

const UUID = '6f1c2d3e-4b5a-4c7d-8e9f-0a1b2c3d4e5f';
const fromSignup = { verifyEmail: { accountUuid: UUID, emailMasked: 'j***@gmail.com', email: 'juan@gmail.com' } };
const renderAt = (state) => render(
  <MemoryRouter initialEntries={[{ pathname: '/passenger/login', state }]}>
    <LoginPage />
  </MemoryRouter>,
);

// 2026-10-28: right after sign-up the login page opens on the code screen to verify the new account's email.
describe('LoginPage email verification', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('opens on "Verify your email" when coming from sign-up', () => {
    renderAt(fromSignup);

    expect(screen.getByText('Verify your email')).toBeInTheDocument();
    expect(screen.getByText('j***@gmail.com')).toBeInTheDocument();
    expect(screen.getByTestId('verify-email-note')).toHaveTextContent('finish creating your account');
  });

  it('asks for a new verification code without the password', async () => {
    renderAt(fromSignup);

    fireEvent.click(screen.getByRole('button', { name: /Resend/i }));

    await waitFor(() => expect(service.resendVerification).toHaveBeenCalledWith(UUID));
    expect(service.login).not.toHaveBeenCalled();
  });

  it('opens on the sign-in form otherwise', () => {
    renderAt(undefined);

    expect(screen.queryByText('Verify your email')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });
});

// 2026-10-29: the code is checked against the account's uuid, never the numeric user id.
describe('LoginPage code check', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('sends the uuid from step 1 with the code', async () => {
    service.verifyOtp.mockResolvedValue({ data: { token: 't', user: { role: 'passenger' } } });
    renderAt(fromSignup);

    // One box per digit, then Verify.
    screen.getAllByRole('textbox').slice(0, 6).forEach((box, i) => fireEvent.change(box, { target: { value: String(i + 1) } }));
    fireEvent.click(screen.getByRole('button', { name: /^Verify/i }));

    await waitFor(() => expect(service.verifyOtp).toHaveBeenCalledWith(UUID, '123456'));
  });
});
