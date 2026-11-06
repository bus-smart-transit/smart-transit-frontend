import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../../api/PassengerService/PassengerService', () => ({ default: { register: vi.fn() } }));
vi.mock('../../../../api/hooks/useRegion', () => ({ useRegion: () => ({ name: 'Davao Region' }) }));
// 2026-11-06: the page now sits in the site header and footer (AuthShell); they are tested on their own.
vi.mock('../../../Layout/Navbar', () => ({ default: () => null }));
vi.mock('../../../Layout/Footer', () => ({ default: () => null }));

import PassengerService from '../../../../api/PassengerService/PassengerService';
import SignUpPage from '../SignupPage';

// Batch 47 part B (2026-11-06): sign-up uses the shared phone field (+63 by default) and sends one E.164 number.

const fillStep1 = (phone) => {
  fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Reyes' } });
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'ana@example.com' } });
  fireEvent.change(screen.getByLabelText('Phone: number'), { target: { value: phone } });
  fireEvent.change(screen.getByLabelText('Date of Birth'), { target: { value: '1995-02-03' } });
  fireEvent.click(screen.getByRole('button', { name: /Continue to Security/ }));
};

beforeEach(() => {
  vi.clearAllMocks();
  PassengerService.register.mockResolvedValue({ data: {} });
});

describe('SignUpPage phone', () => {
  test('starts on +63 and refuses a number that is not a mobile number', () => {
    render(<MemoryRouter><SignUpPage /></MemoryRouter>);

    expect(screen.getByRole('button', { name: 'Phone: country calling code' })).toHaveTextContent('+63');
    fillStep1('12345');

    expect(screen.getByText('Enter a valid mobile number, for example 917 123 4567.')).toBeInTheDocument();
    expect(screen.queryByText('Account Security', { selector: 'h2' })).toBeNull();
  });

  test('sends the number as +639171234567, also when typed with a leading 0', async () => {
    render(<MemoryRouter><SignUpPage /></MemoryRouter>);
    fillStep1('0917 123 4567');

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Strong-pass1' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Strong-pass1' } });
    fireEvent.click(screen.getByLabelText(/I agree to the/));
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => expect(PassengerService.register).toHaveBeenCalledWith(expect.objectContaining({ phone_num: '+639171234567', name: 'Ana Reyes' })));
  });
});
