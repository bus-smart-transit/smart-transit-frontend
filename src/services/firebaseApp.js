import { initializeApp, getApps } from 'firebase/app';

/**
 * 2026-11-07: the one Firebase app of the website, shared by phone notifications (fcmService) and Google sign-in
 * (googleSignIn). The VITE_FIREBASE_* values are public by design (they name the project, they are not secrets).
 */
const getEnv = (name) => (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env[name] || '' : '');

export const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID'),
};

export const vapidKey = getEnv('VITE_FIREBASE_VAPID_KEY');

/** True when the website was built with the Firebase project values (needed by both features). */
export const isFirebaseConfigured = () => Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

export function getFirebaseApp() {
  return getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
}
