// app/_layout.tsx
import { Stack } from "expo-router";
import React, { createContext, useEffect, useState, useContext } from 'react';
import { supabase } from './supabaseClient'; 
import { Session } from '@supabase/supabase-js'; 

// Define the shape of your Supabase context
interface SupabaseContextType {
  supabaseInitialized: boolean;
  session: Session | null;
  userId: string | null;
}

// Create the context
const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// Custom hook to use the Supabase context
export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export default function RootLayout() {
  const [supabaseInitialized, setSupabaseInitialized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Attempt to get the initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(initialSession);
        setUserId(initialSession?.user?.id || null);
      } catch (e: any) {
        console.error("Error getting initial Supabase session:", e.message);
      } finally {
        setSupabaseInitialized(true); // Mark as initialized even if session failed
        console.log("Supabase client initialized.");
      }
    };

    getInitialSession();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUserId(currentSession?.user?.id || null);
      console.log("Auth state changed:", _event, currentSession?.user?.id);
    });

    // Cleanup the listener on component unmount
    return () => {
      authListener?.unsubscribe();
    };
  }, []); // Run only once on component mount

  return (
    <SupabaseContext.Provider value={{ supabaseInitialized, session, userId }}>
      <Stack />
    </SupabaseContext.Provider>
  );
}
