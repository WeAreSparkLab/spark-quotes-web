// supabaseClient.ts
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = 'https://nmzjdcwjqutqdgqkmesy.supabase.co';
const anon = 'REDACTED';

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
}

export const supabase = createClient(url, anon, {
  auth: {
    // On RN: use AsyncStorage. On web/SSR: no custom storage (uses localStorage at runtime).
    ...(storage ? { storage } : {}),
    persistSession: !!storage,          // disable during SSR/web build
    autoRefreshToken: !!storage,        // disable during SSR/web build
    detectSessionInUrl: !storage,       // true on web
  },
});