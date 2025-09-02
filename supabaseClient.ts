// supabaseClient.ts
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nmzjdcwjqutqdgqkmesy.supabase.co';
const supabaseAnonKey = 'REDACTED';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});