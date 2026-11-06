import { GoogleAuthProvider, getAuth, signInWithPopup, signOut } from 'firebase/auth';
import { getFirebaseApp, isFirebaseConfigured } from './firebaseApp';

export { isFirebaseConfigured };

/** Pop-up errors that mean "the person changed their mind", not a failure to report. */
const CANCELLED = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'];

/**
 * 2026-11-07: opens Google's own account chooser (Firebase Authentication) and returns the short-lived proof for our
 * backend (an ID token), or null when the person closed the pop-up. The Firebase session is ended right away: the
 * SmartTransit session comes from our backend, so nothing about Google stays in the browser.
 */
export async function getGoogleIdToken() {
  const auth = getAuth(getFirebaseApp());
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    await signOut(auth).catch(() => {});
    return idToken;
  } catch (error) {
    if (CANCELLED.includes(error?.code)) return null;
    if (error?.code === 'auth/popup-blocked') throw new Error('Your browser blocked the Google window. Allow pop-ups for this site and try again.', { cause: error });
    if (error?.code === 'auth/unauthorized-domain') throw new Error('Google sign-in is not available on this address yet. Use email and password.', { cause: error });
    throw new Error('Google sign-in did not work. Please try again.', { cause: error });
  }
}
