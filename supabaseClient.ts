// supabaseClient.ts
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nmzjdcwjqutqdgqkmesy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tempkY3dqcXV0cWRncWttZXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNjA3MjcsImV4cCI6MjA2NTkzNjcyN30.GC7ZoP4oAKjkJ_Vg0baiZhnW4V2mwnwbaAQw1KGzNDA';

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