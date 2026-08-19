import { messaging, getToken, onMessage } from './firebaseConfig';
import { supabase } from '../supabaseClient';

const VAPID_KEY =
  'BCDXD-701XVUiFogRBlbGmsM28_U24jAifYNri76d_XnCGCLEXEb4thEmj_RINtqgY1JIDptWuI3f6ATHQxgtzY';

/** Current browser permission state, or null when notifications aren't supported. */
export function notificationPermission(): NotificationPermission | null {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return null;
  return Notification.permission;
}

/** True when we can still ask (i.e. the user hasn't granted or blocked yet). */
export function canAskForNotifications(): boolean {
  return notificationPermission() === 'default';
}

async function getAndStoreToken(userId: string): Promise<string | null> {
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) {
      console.warn('No FCM token returned');
      return null;
    }

    const { error } = await supabase
      .from('fcm_tokens')
      .upsert(
        { user_id: userId, token, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,token' }
      );

    if (error) {
      console.error('Error storing FCM token:', error);
      return null;
    }
    return token;
  } catch (error) {
    console.error('Error obtaining FCM token:', error);
    return null;
  }
}

/**
 * Refresh the stored token WITHOUT prompting.
 *
 * Safe to call on every load: it no-ops unless the user has already granted
 * permission. Browsers penalise sites that fire the permission dialog
 * unprompted, and Chrome can auto-block them outright, so the actual request
 * only ever happens from an explicit tap — see requestAndSubscribeFCM.
 */
export async function subscribeFCMIfPermitted(userId: string): Promise<boolean> {
  if (notificationPermission() !== 'granted') return false;
  const token = await getAndStoreToken(userId);
  return !!token;
}

/**
 * Ask for permission and subscribe. MUST be called from a user gesture.
 * Returns true only if permission was granted and a token was stored.
 */
export async function requestAndSubscribeFCM(userId: string): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;
    const token = await getAndStoreToken(userId);
    return !!token;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

export function listenForMessages() {
  if (!messaging) return;

  onMessage(messaging, (payload: any) => {
    if (!payload?.notification) return;
    if (notificationPermission() !== 'granted') return;

    new Notification(payload.notification.title || 'Spark Quotes', {
      body: payload.notification.body,
      icon: payload.notification.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'spark-quotes-notification',
      requireInteraction: false,
    });
  });
}
