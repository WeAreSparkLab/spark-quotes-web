// components/NotificationPrompt.tsx
//
// Soft ask for notification permission.
//
// Browsers penalise sites that fire the permission dialog on load, and Chrome
// can auto-block them. Asking in-app first means we only spend the one
// browser prompt a user ever gives us on people who already said yes here.

import React, { useCallback, useEffect, useState } from "react";
import { Platform, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "./common/Ionicons";
import { canAskForNotifications, notificationPermission, requestAndSubscribeFCM } from "../lib/fcmHelper";
import { trackEvent } from "../utils/analytics";
import { C, S } from "../styles/theme";

const DISMISSED_KEY = "notificationPromptDismissed";

export default function NotificationPrompt({ userId }: { userId: string | null }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Notifications are tied to an account, so there's nothing to offer a
      // logged-out visitor.
      if (Platform.OS !== "web" || !userId) return;
      if (!canAskForNotifications()) return;

      const dismissed = await AsyncStorage.getItem(DISMISSED_KEY);
      if (!cancelled && dismissed !== "1") setVisible(true);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  const dismiss = useCallback(async () => {
    setVisible(false);
    try { await AsyncStorage.setItem(DISMISSED_KEY, "1"); } catch {}
  }, []);

  const enable = useCallback(async () => {
    if (!userId || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Called straight from the tap so the browser still counts it as a
      // user gesture.
      const granted = await requestAndSubscribeFCM(userId);
      trackEvent(granted ? "Notifications Enabled" : "Notifications Declined");

      if (!granted) {
        // Either the user said no, or registration failed. Say so instead of
        // silently closing, and leave the card up so they can retry.
        setError(
          notificationPermission() === "denied"
            ? "Notifications are blocked for this site. You can re-allow them in your browser settings."
            : "Couldn't turn notifications on. Please try again."
        );
        return;
      }

      setVisible(false);
      try { await AsyncStorage.setItem(DISMISSED_KEY, "1"); } catch {}
    } catch {
      setError("Couldn't turn notifications on. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [userId, busy]);

  if (!visible) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <Ionicons name="notifications-outline" size={18} color={C.accent} />
        <Text style={styles.heading}>A quote each morning?</Text>
      </View>

      <Text style={styles.body}>
        We'll send one uplifting quote a day. No spam, and you can turn it off
        any time in Settings.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={dismiss}
          style={styles.secondary}
          accessibilityRole="button"
          accessibilityLabel="Not now"
        >
          <Text style={styles.secondaryText}>Not now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={enable}
          disabled={busy}
          style={[styles.primary, busy && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Enable daily quote notifications"
        >
          <Text style={styles.primaryText}>{busy ? "Enabling…" : "Yes please"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Solid paper, so it reads the same over every world
  card: {
    marginTop: 22,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "rgba(252, 250, 246, 0.96)",
    borderWidth: 1,
    borderColor: C.line,
  },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  heading: { ...S.h2, fontSize: 19 },
  body: { ...S.body, fontSize: 14, marginTop: 6 },
  error: { ...S.body, color: C.danger, fontSize: 13.5, marginTop: 10 },
  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 14 },
  secondary: { ...S.btn, minHeight: 42, paddingHorizontal: 16 },
  secondaryText: { ...S.btnGhostText, fontSize: 14.5 },
  primary: { ...S.btn, ...S.btnPrimary, minHeight: 42, paddingHorizontal: 18 },
  primaryText: { ...S.btnPrimaryText, fontSize: 14.5 },
});