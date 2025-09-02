import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';


const url = 'https://nmzjdcwjqutqdgqkmesy.supabase.co';
const anon = 'REDACTED';


// During static export (SSR) there's no window/localStorage.
// Let Supabase use browser localStorage only at runtime, not during SSR.
const isSSR = typeof window === 'undefined';

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: !isSSR,
    autoRefreshToken: !isSSR,
    detectSessionInUrl: true,
    // no custom storage on web; Supabase will use localStorage when available
  },
});
