import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDW6QaQhQyT_bd9w4bM16wyuaIrqevlJM8",
  authDomain: "sparkquotes-b2df7.firebaseapp.com",
  projectId: "sparkquotes-b2df7",
  storageBucket: "sparkquotes-b2df7.firebasestorage.app",
  messagingSenderId: "256081487740",
  appId: "1:256081487740:web:a0c802082ca8fba5a726f9"
};

const app = initializeApp(firebaseConfig);

let messaging;
if (typeof window !== 'undefined') {
  messaging = getMessaging(app);
}

export { app, messaging, getToken, onMessage };
