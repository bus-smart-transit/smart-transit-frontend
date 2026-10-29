// Batch 15, Items 2/3: Firebase Cloud Messaging background service worker.
// Must live at the site root (public/) so its scope covers the whole app.
// Firebase's Web App config values (apiKey, projectId, etc.) are NOT
// secrets — they're public client identifiers by design (Firebase's real
// security boundary is server-side Security Rules / App Check), so
// hardcoding them here (a static file outside the Vite build, which
// cannot read import.meta.env) is the standard, documented pattern.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyC3lRM_1DBkx5URBj_-ofEDu9W35vRx3tQ',
  authDomain: 'smart-transit-befa2.firebaseapp.com',
  projectId: 'smart-transit-befa2',
  storageBucket: 'smart-transit-befa2.firebasestorage.app',
  messagingSenderId: '858163874167',
  appId: '1:858163874167:web:7bfb6e9e188acf95817972',
});

const messaging = firebase.messaging();

// Background handler — fires when a push arrives while the app/tab is not
// in the foreground. Foreground messages are handled separately in
// src/services/fcmService.js via onMessage(), per Firebase's own split.
messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || 'SmartTransit';
  const body = payload?.notification?.body || '';
  self.registration.showNotification(title, {
    body,
    icon: '/favicon.ico',
    data: payload?.data || {},
  });
});

// Batch 27, Task 1: tapping a "New Trip Assignment" push opens that trip.
// The server puts a relative `link` in the data (backend NotificationLink);
// this mirrors src/utils/notificationTarget.js (a service worker cannot import
// the app's modules). Only same-site /employee/ paths are ever opened.
const CLICKABLE_TYPES = ['trip_assigned', 'shift_block_assigned', 'dispatch_contact'];
const STAFF_ROLES = ['driver', 'conductor', 'operator'];
const DEFAULT_TAB = { driver: 'dashboard', conductor: 'dashboard', operator: 'trips' };

function isSafeStaffPath(path) {
  return (
    typeof path === 'string' &&
    path.startsWith('/employee/') &&
    !path.startsWith('//') &&
    !/[\s\\]/.test(path) &&
    !/^[a-z][a-z0-9+.-]*:/i.test(path)
  );
}

function targetPathFor(data) {
  if (!data || !CLICKABLE_TYPES.includes(String(data.type || ''))) return null;
  if (isSafeStaffPath(data.link)) return data.link;
  if (!STAFF_ROLES.includes(data.role)) return null;
  const blockId = Number(data.shift_block_id);
  if (String(data.type) === 'shift_block_assigned') {
    if (!Number.isInteger(blockId) || blockId <= 0) return null;
    return `/employee/${data.role}/dashboard?tab=${DEFAULT_TAB[data.role]}&block=${blockId}`;
  }
  const tripId = Number(data.trip_id);
  if (!Number.isInteger(tripId) || tripId <= 0) return null;
  return `/employee/${data.role}/dashboard?tab=${DEFAULT_TAB[data.role]}&trip=${tripId}`;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = targetPathFor(event.notification.data);
  if (!path) return; // other notification types keep their old behaviour (just dismiss)

  const url = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (existing) {
        // Reuse the open tab (full navigation so the dashboard reads the link).
        return existing.navigate(url).then((c) => (c || existing).focus());
      }
      return self.clients.openWindow(url);
    }),
  );
});
