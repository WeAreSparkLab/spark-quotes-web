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
import { subscribeFCMIfPermitted, listenForMessages } from '../lib/fcmHelper';
import { pixelBootstrapScript } from '../utils/analytics';

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
  const pixelScript = pixelBootstrapScript();

useEffect(() => {
  let mounted = true;

  // Never let a slow/unreachable Supabase trap the user on the loading
  // spinner. The app renders fine logged-out, and the quote fetch has its
  // own fallback, so after 3s we show the app regardless.
  const initTimeout = setTimeout(() => {
    if (mounted) {
      console.log('[Layout] getSession timed out — rendering app anyway');
      setSupabaseInitialized(true);
    }
  }, 3000);

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
      clearTimeout(initTimeout);
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

  return () => { mounted = false; clearTimeout(initTimeout); subscription?.unsubscribe(); };
}, []);

  // Initialize FCM for web. This only refreshes the token for users who have
  // ALREADY granted permission — the request itself is behind an explicit tap
  // in NotificationPrompt, so we never fire the browser dialog unprompted.
  useEffect(() => {
    if (Platform.OS === 'web' && userId) {
      subscribeFCMIfPermitted(userId).catch(err => console.log('FCM subscription error:', err));
      listenForMessages();
    }
  }, [userId]);

  // Handle app visibility changes (PWA coming back from background)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          // Force re-render when app becomes visible to prevent blank screen
          console.log('App became visible, ensuring content is loaded');
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      // Hide URL bar on load for PWA
      if (window.matchMedia('(display-mode: standalone)').matches) {
        // Already in PWA mode, scroll to hide address bar
        window.scrollTo(0, 1);
        setTimeout(() => window.scrollTo(0, 0), 100);
      }
      
      if ("serviceWorker" in navigator) {
        // NOTE: the Firebase messaging worker is deliberately NOT registered
        // here. It used to be registered at scope "/", which collided with
        // /sw.js below — the later registration replaced it and left
        // getToken() hanging. fcmHelper now registers it lazily under its own
        // scope, only when a user actually enables notifications.

        // Register app service worker
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((reg) => console.log("SW registered:", reg.scope))
          .catch((err) => console.log("SW registration failed:", err));
      }
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
          {/* Google Search Console ownership verification — must stay in the
              served HTML or the property silently loses verification. */}
          <meta name="google-site-verification" content="621BkybwhnFbLzAG7YjO-oewxOlO7idlFUjP_c7M_Us" />
          <meta name="description" content="One uplifting quote every time you open it. Save favorites and submit your own." />
          <meta property="og:title" content="Spark Quotes — Your Daily Boost" />
          <meta property="og:description" content="One uplifting quote every time you open it. Save favorites and submit your own." />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Spark Quotes" />
          <meta property="og:image" content="https://quotes.wearesparklab.com/og.png" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content="Spark Quotes — one uplifting quote, every single day." />
          <meta property="og:url" content="https://quotes.wearesparklab.com/" />
          <meta property="fb:app_id" content="25675478425462421" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Spark Quotes — Your Daily Boost" />
          <meta name="twitter:description" content="One uplifting quote every time you open it. Save favorites and submit your own." />
          <meta name="twitter:image" content="https://quotes.wearesparklab.com/og.png" />
          <link rel="canonical" href="https://quotes.wearesparklab.com/" />
          {/* Structured data is injected by scripts/postbuild.cjs:
              expo-router/head drops <script> tags, so declaring JSON-LD here
              never reached the served HTML. */}
          <script defer data-domain="quotes.wearesparklab.com" src="https://plausible.io/js/script.js" />
          {/* Ad pixels — inert unless EXPO_PUBLIC_META_PIXEL_ID / _GOOGLE_TAG_ID are set */}
          {pixelScript ? (
            <script dangerouslySetInnerHTML={{ __html: pixelScript }} />
          ) : null}
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="Spark Quotes" />
          <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
          <style dangerouslySetInnerHTML={{
            __html: `
              html, body {
                margin: 0;
                padding: 0;
                overflow: hidden;
                height: 100vh;
                width: 100vw;
                position: fixed;
              }
              #root, [data-expo-root], [data-reactroot] {
                height: 100%;
                width: 100%;
                overflow: hidden;
              }
              /* Hide scrollbar for Chrome, Safari and Opera */
              ::-webkit-scrollbar {
                display: none;
                width: 0;
                height: 0;
              }
              /* Hide scrollbar for IE, Edge and Firefox */
              * {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
              body {
                overscroll-behavior: none;
              }
            `
          }} />
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
          <Stack.Screen name="search" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        </Stack>
        {Platform.OS === "web" && showSupport ? <SupportUsBar /> : null}
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
