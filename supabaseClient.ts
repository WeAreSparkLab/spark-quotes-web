// supabaseClient.ts
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zckbrbqxnibzmuesqsok.supabase.co';

// Browser-side publishable key. Public by design — it is compiled into the
// client bundle either way — so it is not a secret and is safe to default to.
//
// The old anon JWT is deliberately NOT kept as a fallback: legacy JWT-based
// keys are disabled on this project, so falling back to one would fail with
// "legacy API keys are disabled" rather than failing obviously.
const PUBLISHABLE_KEY = 'sb_publishable_-NEaU78G8mtqCRFc-9WEFg_aHA5OsIn';

const anon = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || PUBLISHABLE_KEY;

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