// supabaseClient.ts
import { createClient } from '@supabase/supabase-js';


const supabaseUrl = 'https://nmzjdcwjqutqdgqkmesy.supabase.co'; 
const supabaseAnonKey = 'REDACTED';

// Create a single Supabase client for convenience
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// You can also export the auth client separately if needed
export const auth = supabase.auth;