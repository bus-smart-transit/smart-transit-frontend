import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import GoogleButton from '../GoogleButton';
import AddPhonePage from '../AddPhonePage';

const m = vi.hoisted(() => ({
  getGoogleIdToken: vi.fn(),
  googleSignIn: vi.fn(),
  updateProfile: vi.fn(),
  login: vi.fn(),
  auth: { isAuthenticated: true, isLoading: false },
}));
vi.mock('../../../../services/googleSignIn', () => ({ getGoogleIdToken: m.getGoogleIdToken, isFirebaseConfigured: () => true }));
vi.mock('../../../../api/PassengerService/PassengerService', () => ({ default: { googleSignIn: m.googleSignIn, updateProfile: m.updateProfile } }));
vi.mock('../../../../api/hooks/useAuth', () => ({ useAuth: () => ({ ...m.auth, login: m.login }) }));
vi.mock('../../../Layout/Navbar', () => ({ default: () => null }));
vi.mock('../../../Layout/Footer', () => ({ default: () => null }));

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}|{location.state?.next ?? ''}</p>;
}

const renderAt = (path, element) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/passenger/login" element={element ?? <Where />} />
      <Route path="/passenger/add-phone" element={<><Where /><AddPhonePage /></>} />
      <Route path="*" element={<Where />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => { vi.clearAllMocks(); m.auth = { isAuthenticated: true, isLoading: false }; });

// 2026-11-07: Continue with Google, and adding the phone after a Google sign-up.
describe('Google sign-in', () => {
  it('signs in a passenger who has a phone and goes home', async () => {
    m.getGoogleIdToken.mockResolvedValue('proof');
    m.googleSignIn.mockResolvedValue({ data: { token: 'tok', is_new: false, needs_phone: false } });
    renderAt('/passenger/login', <GoogleButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    await waitFor(() => expect(m.login).toHaveBeenCalledWith('tok', true));
    expect(m.googleSignIn).toHaveBeenCalledWith('proof');
    expect((await screen.findByTestId('where')).textContent).toBe('/|/');
  });

  it('sends a new Google passenger to add their phone, then saves it in the one stored form', async () => {
    m.getGoogleIdToken.mockResolvedValue('proof');
    m.googleSignIn.mockResolvedValue({ data: { token: 'tok', is_new: true, needs_phone: true } });
    m.updateProfile.mockResolvedValue({ data: {} });
    renderAt('/passenger/login', <GoogleButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(await screen.findByRole('heading', { name: 'Add your phone number' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    expect(await screen.findByText('Phone number is required')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Mobile number: number'), { target: { value: '09171234567' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    await waitFor(() => expect(m.updateProfile).toHaveBeenCalledWith({ phone_num: '+639171234567' }));
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/|'));
  });

  it('does nothing when the Google window is closed, and shows the server\'s refusal plainly', async () => {
    m.getGoogleIdToken.mockResolvedValueOnce(null);
    renderAt('/passenger/login', <GoogleButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    await waitFor(() => expect(m.getGoogleIdToken).toHaveBeenCalled());
    expect(m.googleSignIn).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();

    m.getGoogleIdToken.mockResolvedValueOnce('proof');
    m.googleSignIn.mockRejectedValueOnce(Object.assign(new Error('Invalid'), { cause: { response: { data: { errors: { id_token: ['This email belongs to a staff account. Staff sign in on the staff login page.'] } } } } }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This email belongs to a staff account');
    expect(m.login).not.toHaveBeenCalled();
  });

  it('sends a signed-out visitor from the add-phone page to log in', async () => {
    m.auth = { isAuthenticated: false, isLoading: false };
    renderAt('/passenger/add-phone', null);
    expect((await screen.findByTestId('where')).textContent).toBe('/passenger/login|');
  });
});
