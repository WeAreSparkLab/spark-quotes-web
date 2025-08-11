// supabaseClient.ts
import { createClient } from '@supabase/supabase-js';


const supabaseUrl = 'https://nmzjdcwjqutqdgqkmesy.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tempkY3dqcXV0cWRncWttZXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNjA3MjcsImV4cCI6MjA2NTkzNjcyN30.GC7ZoP4oAKjkJ_Vg0baiZhnW4V2mwnwbaAQw1KGzNDA';

// Create a single Supabase client for convenience
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// You can also export the auth client separately if needed
export const auth = supabase.auth;