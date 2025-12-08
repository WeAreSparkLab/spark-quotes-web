//app/_layout.tsx

import React, { createContext, useEffect, useState, useContext, useRef } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../supabaseClient";
import { Session } from "@supabase/supabase-js";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform, StyleSheet, View } from "react-native";
import Head from 'expo-router/head';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureProfile } from '../utils/ensureProfile';
import SupportUsBar from "../components/SupportUsBar";
import { usePathname } from "expo-router";
import { subscribeFCM, listenForMessages } from '../lib/fcmHelper';

// Define the shape of your Supabase context
interface SupabaseContextType {
  supabaseInitialized: boolean;
  session: Session | null;
  userId: string | null;
}

// Create the context
const SupabaseContext = createContext<SupabaseContextType | undefined>(
  undefined
);

// Custom hook to use the Supabase context
export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }
  return context;
};

export default function RootLayout() {
  const [supabaseInitialized, setSupabaseInitialized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const permissionRequestedRef = useRef(false);



  const pathname = usePathname();
  const showSupport = !pathname?.startsWith("/settings");

useEffect(() => {
  let mounted = true;

  (async () => {
    try {
      // 1) Get current session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[Layout] getSession result:', session?.user?.id);
      if (!mounted) return;

      setSession(session ?? null);
      setUserId(session?.user?.id ?? null);
      console.log('[Layout] userId set to:', session?.user?.id);

      // 2) Ensure profile if logged in
      if (session?.user?.id) {
        try { await ensureProfile(session.user.id); } catch (e) {
          console.log('ensureProfile failed:', e);
        }
      }
    } catch (e) {
      console.log('getSession error:', e);
    } finally {
      // 3) IMPORTANT: mark initialized
      if (mounted) setSupabaseInitialized(true);
      console.log('[Layout] setSupabaseInitialized(true)');
    }
  })();

  // 4) Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
      setUserId(session?.user?.id ?? null);
      if (session?.user?.id) ensureProfile(session.user.id).catch(() => {});
  });

  return () => { mounted = false; subscription?.unsubscribe(); };
}, []);

  // Initialize FCM for web
  useEffect(() => {
    if (Platform.OS === 'web' && userId) {
      subscribeFCM(userId).catch(err => console.log('FCM subscription error:', err));
      listenForMessages();
    }
  }, [userId]);

  useEffect(() => {
    if (Platform.OS === "web" && "serviceWorker" in navigator) {
      // Register Firebase messaging service worker
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then((reg) => console.log("Firebase SW registered:", reg.scope))
        .catch((err) => console.log("Firebase SW registration failed:", err));
      
      // Register app service worker
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => console.log("SW registered:", reg.scope))
        .catch((err) => console.log("SW registration failed:", err));
    }
  }, []);

  async function ensureProfile(userId: string) {
    await supabase.from('profiles').upsert({ id: userId }, { onConflict: 'id' });
  }

  return (
    <SafeAreaProvider style={styles.rootContainer}>
      <StatusBar style="light" />
      <SupabaseContext.Provider value={{ supabaseInitialized, session, userId }}>
        <Head>
          <title>Spark Quotes — Your Daily Boost</title><link rel="manifest" href="/manifest.webmanifest" />
          <meta name="theme-color" content="#0E0F1D" />
          <meta name="description" content="One uplifting quote every time you open it. Save favorites and submit your own." />
          <meta property="og:title" content="Spark Quotes — Your Daily Boost" />
          <meta property="og:description" content="One uplifting quote every time you open it. Save favorites and submit your own." />
          <meta property="og:type" content="website" />
          <meta property="og:image" content="https://quotes.wearesparklab.com/og.png" />
          <meta property="og:url" content="https://quotes.wearesparklab.com/" />
          <link rel="canonical" href="https://quotes.wearesparklab.com/" />
          <script type="application/ld+json" dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Spark Quotes",
              "url": "https://quotes.wearesparklab.com/",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://quotes.wearesparklab.com/?q={search_term_string}",
                "query-input": "required name=search_term_string"
              },
              "publisher": { "@type": "Organization", "name": "We Are SparkLab" }
            })
          }} />
          <script defer data-domain="quotes.wearesparklab.com" src="https://plausible.io/js/script.js" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="Spark Quotes" />
          <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        </Head>
        <Stack
          screenOptions={{
            statusBarTranslucent: false,
            statusBarStyle: "light",
            contentStyle: { backgroundColor: "#0C0A1A" },
            headerTransparent: false,
            headerStyle: { backgroundColor: "#0C0A1A" },
            headerShadowVisible: false,
            headerTintColor: "#FFFFFF",
            headerTitleStyle: { color: "#FFFFFF", fontWeight: "800" },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="submitQuote" options={{ headerShown: false }} />
          <Stack.Screen name="favorites" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        </Stack>
      </SupabaseContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#0E0F1D',
  },
});
