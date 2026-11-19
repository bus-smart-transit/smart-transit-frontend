import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PassengerService from '../../PassengerService/PassengerService';
import { useAuth } from '../useAuth';
import { getGoogleIdToken, isFirebaseConfigured } from '../../../services/googleSignIn';
import { leaveAccountDeletionNotice } from '../../../utils/accountDeletionNotice';
import { apiFieldErrors } from '../Staff/useStaffDirectory';

/**
 * 2026-11-07: "Continue with Google" on Log In and Sign Up. Google's pop-up gives a proof; our backend checks it and
 * signs the passenger in (or makes the account). A passenger with no phone yet is sent to add it before going on.
 * Returns { available, busy, error, start }.
 */
export function useGoogleSignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const nextPath = () => {
    const state = location?.state ?? {};
    if (state.redirectToBuy) return '/passenger/book';
    return state.redirectTo || '/';
  };

  const start = async () => {
    setError('');
    setBusy(true);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) return;
      const response = await PassengerService.googleSignIn(idToken);
      const data = response?.data ?? {};
      if (!data.token) throw new Error('Google sign-in did not work. Please try again.');
      login(data.token, true);
      if (data.deletion_cancelled) leaveAccountDeletionNotice({ cancelled: true });
      navigate(data.needs_phone ? '/passenger/add-phone' : nextPath(), { replace: true, state: { next: nextPath() } });
    } catch (err) {
      const first = Object.values(apiFieldErrors(err)).flat()[0];
      setError(first || err?.message || 'Google sign-in did not work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return { available: isFirebaseConfigured(), busy, error, start };
}
