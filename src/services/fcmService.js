import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
// 2026-11-07: the Firebase app is shared with Google sign-in (services/firebaseApp.js).
import { firebaseConfig, getFirebaseApp, vapidKey } from './firebaseApp';

const isConfigured = () =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId && vapidKey);

let messagingInstance = null;
let foregroundUnsubscribe = null;

/**
 * Batch 15, Items 2/3: requests notification permission, registers the
 * service worker, and obtains an FCM device token. Deliberately fail-soft
 * (mirrors the backend's FcmService) — returns null on any failure
 * (unsupported browser, permission denied, missing config) rather than
 * throwing, since push notifications must never block the rest of the
 * dashboard from working.
 *
 * @param {(payload: object) => void} [onForegroundMessage] optional callback
 *   invoked when a push arrives while the tab is in the foreground (Item 3's
 *   "silent dashboard refresh" option can be implemented by passing a
 *   callback that re-fetches data instead of showing a banner).
 * @returns {Promise<string|null>} the device token if registration succeeded.
 */
export async function initFcmAndGetToken(onForegroundMessage) {
  if (!isConfigured()) {
    return null;
  }

  try {
    if (!('serviceWorker' in navigator) || !(await isSupported())) {
      return null;
    }

    if (Notification.permission === 'denied') {
      return null;
    }
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return null;
      }
    }

    const app = getFirebaseApp();
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    messagingInstance = getMessaging(app);

    const token = await getToken(messagingInstance, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (onForegroundMessage) {
      if (foregroundUnsubscribe) foregroundUnsubscribe();
      foregroundUnsubscribe = onMessage(messagingInstance, onForegroundMessage);
    }

    return token || null;
  } catch (err) {
    // Fail-soft: log for debugging, never throw into the caller's render path.
    console.warn('fcmService: push notification setup failed', err);
    return null;
  }
}

export function stopForegroundListener() {
  if (foregroundUnsubscribe) {
    foregroundUnsubscribe();
    foregroundUnsubscribe = null;
  }
}
