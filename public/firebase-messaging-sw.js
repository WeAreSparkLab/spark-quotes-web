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
  
  const notificationTitle = payload.notification?.title || '✨ Your Daily Quote is Ready';
  const notificationOptions = {
    body: payload.notification?.body || 'Tap to discover today\'s inspiration',
    icon: 'https://quotes.wearesparklab.com/icons/icon-192.png',
    badge: 'https://quotes.wearesparklab.com/icons/maskable-192.png',
    tag: 'spark-quotes-daily',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {
      url: payload.data?.url || 'https://quotes.wearesparklab.com/',
      dateOfArrival: Date.now(),
      action: 'open-app'
    },
    actions: [
      {
        action: 'open',
        title: 'Read Quote',
        icon: 'https://quotes.wearesparklab.com/icons/icon-192.png'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action);
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then((windowClients) => {
      // Check if there's already a PWA window open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        const clientUrl = new URL(client.url);
        // Match any window on the same origin
        if (clientUrl.origin === 'https://quotes.wearesparklab.com' && 'focus' in client) {
          // Navigate to home and focus
          client.navigate('/');
          return client.focus();
        }
      }
      // If no window is open, open the PWA
      if (clients.openWindow) {
        return clients.openWindow('/?source=notification');
      }
    })
  );
});
