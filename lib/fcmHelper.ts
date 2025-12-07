import { messaging, getToken, onMessage } from './firebaseConfig';
import { supabase } from '../supabaseClient';

export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      const token = await getToken(messaging, {
        vapidKey: 'BCDXD-701XVUiFogRBlbGmsM28_U24jAifYNri76d_XnCGCLEXEb4thEmj_RINtqgY1JIDptWuI3f6ATHQxgtzY',
      });
      console.log('FCM Token:', token);
      return token;
    } else {
      console.log('Notification permission denied.');
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
}

export async function subscribeFCM(userId: string) {
  const token = await requestNotificationPermission();
  if (token) {
    const { error } = await supabase
      .from('fcm_tokens')
      .upsert({ user_id: userId, token: token, updated_at: new Date() }, { onConflict: 'user_id,token' });
    
    if (error && error.code !== '23505') {
      // Ignore duplicate key errors (23505)
      console.error('Error storing FCM token:', error);
    } else if (!error) {
      console.log('FCM token stored successfully');
    }
  }
}

export function listenForMessages() {
  if (messaging) {
    onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      console.log('📬 Notification received while app is open!');
      
      if (payload.notification) {
        // Show browser notification even when tab is active
        if (Notification.permission === 'granted') {
          new Notification(payload.notification.title || 'New Message', {
            body: payload.notification.body,
            icon: payload.notification.icon || '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            tag: 'spark-quotes-notification',
            requireInteraction: false
          });
        }
        
        // You can also show an in-app toast/alert here if you want
        console.log('Title:', payload.notification.title);
        console.log('Body:', payload.notification.body);
      }
    });
  }
}
