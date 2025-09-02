import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';


const url = 'https://nmzjdcwjqutqdgqkmesy.supabase.co';
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tempkY3dqcXV0cWRncWttZXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNjA3MjcsImV4cCI6MjA2NTkzNjcyN30.GC7ZoP4oAKjkJ_Vg0baiZhnW4V2mwnwbaAQw1KGzNDA';


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
