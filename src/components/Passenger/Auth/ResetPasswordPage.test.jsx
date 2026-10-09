import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../../../api/PassengerService/PassengerService', () => ({
  default: { resetPassword: vi.fn() },
}));
vi.mock('../../../api/StaffService/StaffBaseService', () => ({
  default: { resetPassword: vi.fn() },
}));

import PassengerService from '../../../api/PassengerService/PassengerService';
import StaffService from '../../../api/StaffService/StaffBaseService';
import ResetPasswordPage from './ResetPasswordPage';
import StaffResetPasswordPage from '../../Staff/StaffResetPasswordPage';

// Stands in for the sign-in page: shows where we landed and the notice it was given.
function Landing() {
  const location = useLocation();
  return <div>landed:{location.pathname}|notice:{location.state?.notice}</div>;
}

// Shows the address, to prove the token is removed from it.
function AddressProbe() {
  const location = useLocation();
  return <div data-testid="address">{location.pathname + location.search}</div>;
}

const renderAt = (url, Page, signInPath) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes>
      <Route path="/reset" element={<><Page /><AddressProbe /></>} />
      <Route path={signInPath} element={<Landing />} />
    </Routes>
  </MemoryRouter>,
);

const fillAndSubmit = (password, confirmation) => {
  fireEvent.change(screen.getByPlaceholderText('Minimum 8 characters'), { target: { value: password } });
  fireEvent.change(screen.getByPlaceholderText('Repeat new password'), { target: { value: confirmation } });
  fireEvent.click(screen.getByRole('button', { name: /update password/i }));
};

const cases = [
  { name: 'passenger', Page: ResetPasswordPage, service: PassengerService, signInPath: '/passenger/login' },
  { name: 'staff', Page: StaffResetPasswordPage, service: StaffService, signInPath: '/employee/login' },
];

describe.each(cases)('$name reset password page', ({ Page, service, signInPath }) => {
  beforeEach(() => vi.clearAllMocks());

  test('never shows the token, and removes it from the address bar', async () => {
    renderAt('/reset?token=SECRET-TOKEN-123&email=rider%40example.com', Page, signInPath);

    expect(screen.queryByDisplayValue('SECRET-TOKEN-123')).toBeNull();
    expect(screen.queryByText(/reset token/i)).toBeNull();
    expect(screen.queryByPlaceholderText(/paste reset token/i)).toBeNull();
    expect(screen.getByText(/rider@example\.com/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('address').textContent).toBe('/reset'));
  });

  test('sends the link token and email with the new password, then goes to sign in with a notice', async () => {
    service.resetPassword.mockResolvedValue({ message: 'ok' });
    renderAt('/reset?token=SECRET-TOKEN-123&email=rider%40example.com', Page, signInPath);

    fillAndSubmit('NewPassw0rd!', 'NewPassw0rd!');

    await waitFor(() => expect(service.resetPassword).toHaveBeenCalledWith({
      token: 'SECRET-TOKEN-123',
      email: 'rider@example.com',
      password: 'NewPassw0rd!',
      password_confirmation: 'NewPassw0rd!',
    }));
    expect(await screen.findByText(new RegExp(`landed:${signInPath}\\|notice:Password updated`))).toBeInTheDocument();
  });

  test('stays on the page with the server message when the link is refused', async () => {
    service.resetPassword.mockRejectedValue(new Error('Invalid or expired password reset token. Please request a new one.'));
    renderAt('/reset?token=OLD&email=rider%40example.com', Page, signInPath);

    fillAndSubmit('NewPassw0rd!', 'NewPassw0rd!');

    expect(await screen.findByText(/invalid or expired password reset token/i)).toBeInTheDocument();
    expect(screen.queryByText(/landed:/)).toBeNull();
  });

  test('a page opened without a complete link asks for the email link and shows no form', () => {
    renderAt('/reset', Page, signInPath);

    expect(screen.getByText(/incomplete or has already been opened/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /update password/i })).toBeNull();
    expect(screen.queryByPlaceholderText('Minimum 8 characters')).toBeNull();
  });

  test('checks the password before calling the server', async () => {
    renderAt('/reset?token=T&email=rider%40example.com', Page, signInPath);

    fillAndSubmit('NewPassw0rd!', 'different123');

    expect(await screen.findByText(/does not match/i)).toBeInTheDocument();
    expect(service.resetPassword).not.toHaveBeenCalled();
  });
});
