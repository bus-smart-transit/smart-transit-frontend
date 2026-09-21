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
