// Public folder/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA1CaZGqUyouFvh8OEWVttQA2EBpVS74Ys",
  authDomain: "fasi-law-chamber.firebaseapp.com",
  projectId: "fasi-law-chamber",
  storageBucket: "fasi-law-chamber.firebasestorage.app",
  messagingSenderId: "566428539789",
  appId: "1:566428539789:web:a5c29400e2f30ac51fbbc4",
});

const messaging = firebase.messaging();

// Handle notification in background
messaging.onBackgroundMessage((payload) => {
  console.log('Background message:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png',
    badge: '/badge.png',
    tag: 'notification',
    requireInteraction: false,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].url === '/' && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
