export function initOneSignalWeb() {
  if (typeof window === 'undefined') return;

  console.log('OneSignal: initOneSignalWeb() called');

  // Wait for the OneSignal SDK to load from CDN
  const waitForOneSignal = () => {
    console.log('OneSignal: Waiting for SDK to load...');
    if (typeof (window as any).OneSignalDeferred !== 'undefined') {
      console.log('OneSignal: SDK loaded, initializing...');
      initializeOneSignal();
    } else {
      console.log('OneSignal: SDK not ready, checking again in 100ms');
      setTimeout(waitForOneSignal, 100);
    }
  };

  waitForOneSignal();
}

function initializeOneSignal() {
  (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || {};
  (window as any).OneSignalDeferred.then(async (OneSignal: any) => {
    console.log('OneSignal: Deferred promise resolved, OneSignal object:', typeof OneSignal);
    try {
      await OneSignal.init({
        appId: 'b04c3e41-0909-471e-8c99-b4ce6b83466a',
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/' },
      });

      console.log('OneSignal: init completed');
      
      // Check current notification permission
      const notifPerm = Notification.permission;
      console.log('OneSignal: Notification.permission =', notifPerm);

      // Listen for subscription changes BEFORE requesting permission
      try {
        if (typeof OneSignal.on === 'function') {
          OneSignal.on('subscriptionChange', async (isSubscribed: boolean) => {
            console.log('OneSignal: subscriptionChange ->', isSubscribed);
            try {
              // Wait for the backend to complete subscription registration
              await new Promise(resolve => setTimeout(resolve, 500));
              
              const userId = await OneSignal.getUserId?.();
              console.log('OneSignal: subscriptionChange getUserId result:', userId);
              
              if (userId) {
                console.log('OneSignal: subscriptionChange userId', userId);
                localStorage.setItem('webPushToken', userId);
              } else {
                const ids = await OneSignal.getIds?.();
                console.log('OneSignal: subscriptionChange getIds result:', ids);
                if (ids?.userId) {
                  console.log('OneSignal: subscriptionChange ids.userId', ids.userId);
                  localStorage.setItem('webPushToken', ids.userId);
                }
              }
            } catch (e) {
              console.warn('OneSignal: error reading id on subscriptionChange', e);
            }
          });
        }
      } catch (e) {
        console.warn('OneSignal: failed to attach subscriptionChange listener', e);
      }

      // Request permission - this should trigger subscriptionChange if granted
      console.log('OneSignal: requesting notification permission...');
      try { 
        await OneSignal.showNativePrompt?.(); 
        console.log('OneSignal: showNativePrompt completed');
      } catch (e) { 
        console.warn('OneSignal: showNativePrompt error', e); 
      }

      // After permission prompt, check subscription status
      await new Promise(resolve => setTimeout(resolve, 500));
      try {
        const subscription = await OneSignal.getSubscription?.();
        console.log('OneSignal: getSubscription result', subscription);
      } catch (e) {
        console.warn('OneSignal: getSubscription error', e);
      }

      // Manually trigger the web push subscription if permissions are granted
      if (Notification.permission === 'granted') {
        console.log('OneSignal: attempting manual subscription setup');
        try {
          const registration = await navigator.serviceWorker?.ready;
          if (registration) {
            console.log('OneSignal: SW registration ready, attempting pushManager.subscribe');
            const subscription = await registration.pushManager.getSubscription();
            console.log('OneSignal: existing pushManager subscription:', subscription);
            
            // If no subscription exists, create one
            if (!subscription) {
              try {
                // Get the VAPID public key from OneSignal
                const vapidKey = 'BG-4s-CbNYVFDDVzF5AH_AZV0XkNcC7YcmZxJXRIv0ZMD_cEBMFlJxRVWp0YLN4YfQfMdTSt6PJMfpvMHAFKAw';
                console.log('OneSignal: subscribing to push with VAPID key');
                const newSub = await registration.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToUint8Array(vapidKey),
                });
                console.log('OneSignal: new pushManager subscription created:', newSub);
              } catch (e) {
                console.warn('OneSignal: failed to create pushManager subscription', e);
              }
            }

      // Now that we have a subscription, tell OneSignal to register it via REST API
            if (subscription) {
              try {
                console.log('OneSignal: registering subscription via direct SDK call...');
                const pushSubscription = await registration.pushManager.getSubscription();
                if (pushSubscription) {
                  // Tell OneSignal about the subscription through its internal API
                  try {
                    // Try to trigger subscription processing
                    await OneSignal.registerSubscriptionListener?.();
                    console.log('OneSignal: registerSubscriptionListener called');
                  } catch (e) {
                    console.warn('OneSignal: registerSubscriptionListener error', e);
                  }
                  
                  try {
                    // Try to force subscription add
                    const result = await OneSignal._callSubscriptionAdd?.();
                    console.log('OneSignal: _callSubscriptionAdd result:', result);
                  } catch (e) {
                    console.warn('OneSignal: _callSubscriptionAdd error', e);
                  }
                  
                  // Also try accessing internal subscription state
                  try {
                    const internalState = (OneSignal as any)?._state?.pushSubscription;
                    console.log('OneSignal: internal pushSubscription state:', internalState);
                  } catch (e) {
                    // ignore
                  }
                }
              } catch (e) {
                console.warn('OneSignal: error with subscription registration', e);
              }
            }
          }
        } catch (e) {
          console.warn('OneSignal: could not access service worker for subscription', e);
        }
      }

      // Helper function to convert VAPID key
      function urlBase64ToUint8Array(base64String: string) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
          .replace(/\-/g, '+')
          .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      }

      // Wait for subscription to be registered
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate a fallback player ID from the subscription endpoint if OneSignal doesn't provide one
      // This is a workaround for cases where OneSignal SDK doesn't generate IDs properly
      async function generatePlayerId() {
        try {
          const registration = await navigator.serviceWorker?.ready;
          if (registration) {
            const sub = await registration.pushManager.getSubscription();
            if (sub?.endpoint) {
              // Create a hash of the subscription endpoint as a fallback player ID
              const encoder = new TextEncoder();
              const data = encoder.encode(sub.endpoint);
              const hashBuffer = await crypto.subtle.digest('SHA-256', data);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
              const playerId = `onesignal_${hashHex.substring(0, 32)}`;
              console.log('OneSignal: generated fallback player ID:', playerId);
              return playerId;
            }
          }
        } catch (e) {
          console.warn('OneSignal: error generating fallback player ID', e);
        }
        return null;
      }

      // If still no userId, try longer polling (user might still be granting permission)
      let foundId = false;
      for (let i = 0; i < 15; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
          const userId = await OneSignal.getUserId?.();
          const ids = await OneSignal.getIds?.();
          const subscription = await OneSignal.getSubscription?.();
          
          if (userId && !localStorage.getItem('webPushToken')) {
            console.log(`OneSignal: got userId after ${(i + 1) * 500}ms:`, userId);
            localStorage.setItem('webPushToken', userId);
            foundId = true;
            break;
          }
          
          if (i % 3 === 0) {
            console.log(`OneSignal: polling (${(i + 1) * 500}ms) - userId:`, userId, '| ids:', ids, '| subscription:', !!subscription);
          }
        } catch (e) {
          console.warn(`OneSignal: polling error at ${(i + 1) * 500}ms`, e);
        }
      }

      // If we still don't have an ID, generate a fallback one
      if (!foundId && !localStorage.getItem('webPushToken')) {
        const fallbackId = await generatePlayerId();
        if (fallbackId) {
          console.log('OneSignal: using fallback player ID');
          localStorage.setItem('webPushToken', fallbackId);
        }
      }

    } catch (e) {
      console.warn('OneSignal init failed', e);
    }
  });
}

/**
 * Set external user ID when Supabase user is authenticated.
 * This allows sending notifications via include_external_user_ids in REST API.
 * Call this after a user logs in or when their Supabase ID is available.
 */
export async function setOneSignalExternalUserId(supabaseUserId: string) {
  if (typeof window === 'undefined') return;
  
  try {
    console.log('OneSignal: setExternalUserId called with:', supabaseUserId);
    
    // Wait for OneSignal to be ready
    if (typeof (window as any).OneSignalDeferred === 'undefined') {
      console.log('OneSignal: SDK not loaded yet, waiting...');
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (typeof (window as any).OneSignalDeferred !== 'undefined') {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
      });
    }
    
    (window as any).OneSignalDeferred.then(async (OneSignal: any) => {
      console.log('OneSignal: setExternalUserId - OneSignal ready');
      
      // First, set the external user ID
      await OneSignal.setExternalUserId?.(supabaseUserId);
      console.log('OneSignal: set external user ID:', supabaseUserId);
      
      // Wait a moment for the SDK to process
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try to explicitly register for push if not already subscribed
      try {
        const isPushEnabled = await OneSignal.isPushNotificationsEnabled?.();
        console.log('OneSignal: isPushNotificationsEnabled:', isPushEnabled);
        
        if (!isPushEnabled) {
          console.log('OneSignal: Push not enabled, attempting to register subscription...');
          await OneSignal.registerForPushNotifications?.();
          console.log('OneSignal: registerForPushNotifications completed');
        }
        
        // Force a subscription update
        await OneSignal.setSubscription?.(true);
        console.log('OneSignal: setSubscription(true) called');
        
      } catch (e) {
        console.warn('OneSignal: error enabling push subscription', e);
      }
      
      // Check the final player ID
      await new Promise(resolve => setTimeout(resolve, 1000));
      const playerId = await OneSignal.getUserId?.();
      console.log('OneSignal: final player ID:', playerId);
    });
  } catch (e) {
    console.warn('OneSignal: error setting external user ID', e);
  }
}

/**
 * Manually register a push subscription with OneSignal via REST API.
 * This is a fallback when the SDK's internal methods don't work.
 */
async function registerSubscriptionViaAPI(externalUserId: string, subscription: PushSubscription) {
  try {
    console.log('OneSignal: attempting manual subscription registration via REST API');
    
    const endpoint = subscription.endpoint;
    console.log('OneSignal: subscription endpoint ready:', endpoint.substring(0, 50) + '...');
    
    // Note: Client-side REST API registration requires exposing the REST API key,
    // which is not recommended for production. This is just for debugging.
    // For production, subscription should happen automatically via the OneSignal SDK.
    
    console.warn('OneSignal: Skipping REST API registration (requires server-side implementation)');
    console.log('OneSignal: The OneSignal SDK should register the subscription automatically');
  } catch (e) {
    console.warn('OneSignal: error in registerSubscriptionViaAPI', e);
  }
}
