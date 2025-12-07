//app/_layout.tsx

import React, { createContext, useEffect, useState, useContext, useRef } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../supabaseClient";
import { Session } from "@supabase/supabase-js";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as sNotifications from "expo-notifications";
import { Alert, Platform, StyleSheet, View } from "react-native";
import Head from 'expo-router/head';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureProfile } from '../utils/ensureProfile';
import SupportUsBar from "../components/SupportUsBar";
import { usePathname } from "expo-router";
import { initOneSignalWeb, setOneSignalExternalUserId } from "../lib/onesignalWeb";
import { initOneSignalNative } from "../lib/onesignalInit";

const notificationHandler: sNotifications.NotificationHandler = {
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
};

sNotifications.setNotificationHandler(notificationHandler);

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

// --- Function to Register for Notifications ---
async function registerForPushNotificationsAsync(): Promise<string> {
  if (Platform.OS === "android") {
    await sNotifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: sNotifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  // 2. Check existing permission status
  const { status: existingStatus } = await sNotifications.getPermissionsAsync();

  // 3. If already granted, return "granted" immediately
  if (existingStatus === "granted") {
    return "granted";
  }
  // 4. If not granted, show your custom pre-permission prompt
  //    and await the user's decision from that prompt
  const finalPermissionStatus = await new Promise<string>((resolve) => {
    Alert.alert(
      "Get Daily Inspiration!",
      "Allow us to send you daily quotes to brighten your day. You can change this anytime in settings.",
      [
        {
          text: "Not now",
          onPress: () => {
            console.log("Permission prompt dismissed by user.");
            resolve("denied"); // User chose not now, so effectively denied for now
          },
          style: "cancel",
        },
        {
          text: "Allow Notifications",
          onPress: async () => {
            // This triggers the system notification permission prompt
            const { status } = await sNotifications.requestPermissionsAsync();
            resolve(status); // Resolve with the status from the system prompt
          },
        },
      ],
      { cancelable: false }
    );
  });

  // 5. After the user has interacted with both your custom prompt AND the system prompt (if shown)
  //    Check the final outcome and provide feedback if permission wasn't granted.
  if (finalPermissionStatus !== "granted") {
    Alert.alert(
      "Permission Required",
      "Please enable push notifications in your device settings to receive daily quotes.",
      [{ text: "OK" }]
    );
  }

  // 6. Return the final permission status
  return finalPermissionStatus;
}

export default function RootLayout() {
  const [supabaseInitialized, setSupabaseInitialized] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const permissionRequestedRef = useRef(false);

  // Initialize OneSignal (web or native) from inside the component
  useEffect(() => {
    try {
      if (Platform.OS === 'web') initOneSignalWeb();
      else initOneSignalNative();
    } catch (e) {
      console.warn('OneSignal init failed:', e);
    }
  }, []);

  // Set OneSignal external user ID when user logs in
  useEffect(() => {
    console.log('[Layout] useEffect[userId] triggered, userId:', userId, 'Platform.OS:', Platform.OS);
    if (userId && Platform.OS === 'web') {
      console.log('[Layout] calling setOneSignalExternalUserId with:', userId);
      setOneSignalExternalUserId(userId);
    }
  }, [userId]);

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

  useEffect(() => {
    if (Platform.OS === "web" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => console.log("SW registered:", reg.scope))
        .catch((err) => console.log("SW registration failed:", err));
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    try {
      sNotifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    } catch { }
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
          <script defer src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" />
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
