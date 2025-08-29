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

  useEffect(() => {
    const checkAndRegisterNotifications = async () => {
      try {
        if (permissionRequestedRef.current) return;

        // 1) Never run on web
        if (Platform.OS === 'web') return;

        // 2) Skip if the native module isn't present in this build
        const moduleLooksPresent =
          typeof sNotifications.getPermissionsAsync === 'function' &&
          typeof sNotifications.requestPermissionsAsync === 'function' &&
          typeof sNotifications.setNotificationChannelAsync === 'function';
        if (!moduleLooksPresent) {
          console.log('Notifications module not available; skipping.');
          return;
        }
        // 3) Only register if the user enabled notifications in Settings
        const enabledRaw = await AsyncStorage.getItem('notificationsEnabled');
        const userEnabled = enabledRaw ? JSON.parse(enabledRaw) : false;
        if (!userEnabled) return;

        await registerForPushNotificationsAsync();
        permissionRequestedRef.current = true;
      } catch (e: any) {
        console.log('Skipping notifications registration:', e?.message ?? e);
      }
    };
    checkAndRegisterNotifications();

    // (your existing session code stays the same)
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(initialSession);
        setUserId(initialSession?.user?.id || null);
      } catch (e: any) {
        console.error('Error getting initial Supabase session:', e.message);
      } finally {
        setSupabaseInitialized(true);
      }
    };
    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUserId(currentSession?.user?.id || null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider style={styles.rootContainer}>
      <StatusBar style="light" />
      <Head>
        <title>Spark Quotes — Your Daily Boost</title>
        <meta name="description" content="One uplifting quote every time you open it. Save favorites and submit your own." />
        <meta property="og:title" content="Spark Quotes — Your Daily Boost" />
        <meta property="og:description" content="One uplifting quote every time you open it. Save favorites and submit your own." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://quotes.wearesparklab.com/og.png" />
        <meta property="og:url" content="https://quotes.wearesparklab.com/" />
        <link rel="canonical" href="https://quotes.wearesparklab.com/" />
      </Head>
      <SupabaseContext.Provider
        value={{ supabaseInitialized, session, userId }}
      >
        <Stack
          screenOptions={{
            statusBarTranslucent: false,
            statusBarStyle: 'light',
            contentStyle: { backgroundColor: '#0C0A1A' },

            headerTransparent: false,
            headerStyle: {
              backgroundColor: '#0C0A1A',
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: 'rgba(255,255,255,0.12)',
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { color: '#FFFFFF', fontWeight: '800' },
            headerShadowVisible: false,
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
