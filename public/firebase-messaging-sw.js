importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDW6QaQhQyT_bd9w4bM16wyuaIrqevlJM8",
  authDomain: "sparkquotes-b2df7.firebaseapp.com",
  projectId: "sparkquotes-b2df7",
  storageBucket: "sparkquotes-b2df7.firebasestorage.app",
  messagingSenderId: "256081487740",
  appId: "1:256081487740:web:a0c802082ca8fba5a726f9"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'Spark Quotes';
  const notificationOptions = {
    body: payload.notification?.body || 'Your daily inspiration',
    icon: payload.notification?.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'spark-quotes-daily',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {
      url: payload.data?.url || '/',
      dateOfArrival: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'Read Quote'
      },
      {
        action: 'close',
        title: 'Dismiss'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});
