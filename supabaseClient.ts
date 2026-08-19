// supabaseClient.ts
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://nmzjdcwjqutqdgqkmesy.supabase.co';

// Browser-side key. Both of these are public by design — they are compiled
// into the client bundle either way — so neither is a secret.
//
// Prefer the new publishable key (sb_publishable_...). The legacy anon JWT is
// only a fallback so the app keeps working until the env var is set; it stops
// working once legacy JWT-based keys are switched off in the dashboard.
const LEGACY_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tempkY3dqcXV0cWRncWttZXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNjA3MjcsImV4cCI6MjA2NTkzNjcyN30.GC7ZoP4oAKjkJ_Vg0baiZhnW4V2mwnwbaAQw1KGzNDA';

const anon = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || LEGACY_ANON;

// Detect RN vs web/SSR
const isReactNative =
  typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative';

// Only require RN shims on device (NOT during SSR)
let storage: any | undefined;
if (isReactNative) {
  try {
    require('react-native-get-random-values');
    // Lazy require prevents bundling on web/SSR
    storage = require('@react-native-async-storage/async-storage').default;
  } catch (e) {
    console.log('[Supabase] AsyncStorage not available:', e);
  }
} else if (typeof window !== 'undefined' && window.localStorage) {
  // Web: use localStorage so Supabase sessions persist across reloads
  storage = {
    getItem: (key: string) => Promise.resolve(window.localStorage.getItem(key)),
    setItem: (key: string, value: string) => {
      window.localStorage.setItem(key, value);
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      window.localStorage.removeItem(key);
      return Promise.resolve();
    },
  };
}

export const supabase = createClient(url, anon, {
  auth: {
    // On RN: use AsyncStorage. On web: use localStorage adapter above.
    ...(storage ? { storage } : {}),
    persistSession: !!storage,
    autoRefreshToken: !!storage,
    detectSessionInUrl: !isReactNative, // enable URL detection on web
  },
});