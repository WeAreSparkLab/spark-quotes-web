import { messaging, getToken, onMessage } from './firebaseConfig';
import { supabase } from '../supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

/**
 * Dedicated scope for the FCM worker.
 *
 * The app's own /sw.js claims scope "/". A second registration at the same
 * scope replaces the first, which used to evict the messaging worker and
 * leave getToken() hanging forever. Giving FCM its own scope lets both live
 * side by side, and we hand the registration to getToken explicitly rather
 * than relying on it to find one.
 */
const FCM_SCOPE = '/firebase-cloud-messaging-push-scope';

async function getFcmRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;

  // getRegistration() matches by URL prefix, so with /sw.js controlling "/"
  // it happily returns THAT worker for this scope. Confirm we actually got
  // the messaging worker before reusing it.
  const existing = await navigator.serviceWorker.getRegistration(FCM_SCOPE);
  const isMessagingWorker =
    !!existing &&
    [existing.active, existing.waiting, existing.installing].some((w) =>
      w?.scriptURL.includes('firebase-messaging-sw.js')
    );

  if (existing && isMessagingWorker) return existing;

  return navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: FCM_SCOPE });
}

/** Reject rather than hang forever, so the UI can always recover. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

const DEVICE_ID_KEY = 'sparkDeviceId';

/**
 * Stable id for this browser.
 *
 * FCM tokens identify a browser and get reissued over time, so without this
 * every re-registration added another row and one device ended up with
 * several live tokens — each of which FCM delivers, hence duplicate
 * notifications. Keyed on this, registration is idempotent per device.
 */
async function getDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;

    const generated =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    // Storage unavailable — fall back to a per-session id rather than failing
    return `ephemeral-${Math.random().toString(36).slice(2, 10)}`;
  }
}

async function getAndStoreToken(userId: string): Promise<string | null> {
  try {
    if (!messaging) {
      console.warn('Firebase messaging unavailable in this browser');
      return null;
    }

    const serviceWorkerRegistration = await withTimeout(
      getFcmRegistration(),
      10000,
      'Service worker registration'
    );

    const token = await withTimeout(
      getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration }),
      15000,
      'getToken'
    );
    if (!token) {
      console.warn('No FCM token returned');
      return null;
    }

    const deviceId = await getDeviceId();

    // Keyed on the device, so re-registering replaces this browser's row
    // instead of adding another one alongside it.
    const { error } = await supabase
      .from('fcm_tokens')
      .upsert(
        { user_id: userId, token, device_id: deviceId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,device_id' }
      );

    if (error) {
      console.error('Error storing FCM token:', error);
      return null;
    }

    // This browser may still have rows from before device ids existed, or
    // from a previous token. A device only ever needs its current one.
    const { error: cleanupError } = await supabase
      .from('fcm_tokens')
      .delete()
      .eq('user_id', userId)
      .neq('token', token)
      .or(`device_id.eq.${deviceId},device_id.is.null`);

    if (cleanupError) console.log('Token cleanup skipped:', cleanupError.message);

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
  if (!token) return false;

  // Backfill preferences for anyone who granted permission before this row
  // was being created — without it they hold a token the cron never reads.
  await ensureNotificationPreferences(userId);
  return true;
}

/**
 * Make sure the user has a notification_preferences row.
 *
 * The send-notifications cron iterates notification_preferences, NOT
 * fcm_tokens — so a stored token with no preferences row receives nothing.
 * Settings creates this row when you save there, but enabling from the
 * prompt has to create it too.
 *
 * ignoreDuplicates means an existing row (and whatever times the user has
 * already chosen) is left untouched.
 */
async function ensureNotificationPreferences(userId: string): Promise<void> {
  let timezone = 'UTC';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    /* keep UTC */
  }

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: userId,
        enabled: true,
        times: ['09:00'], // the prompt promises one a day
        timezone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id', ignoreDuplicates: true }
    );

  if (error) console.error('Could not create notification preferences:', error);
}

/**
 * Ask for permission and subscribe. MUST be called from a user gesture.
 * Returns true only if permission was granted and a token was stored.
 */
export async function requestAndSubscribeFCM(userId: string): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  try {
    const permission = await withTimeout(
      Notification.requestPermission(),
      60000,
      'Permission prompt'
    );
    if (permission !== 'granted') return false;

    const token = await getAndStoreToken(userId);
    if (!token) return false;

    await ensureNotificationPreferences(userId);
    return true;
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
      tag: 'spark-quotes-daily', // must match the server payload tag
      requireInteraction: false,
    });
  });
}
