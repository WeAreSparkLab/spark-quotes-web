// components/SupportUsBar.tsx
//
// Floating "support us" bar for web.
//
// Deliberately NOT shown to new visitors: asking a stranger for money in
// their first few seconds costs more in bounce than it earns in tips. It
// appears from the third visit, once someone has actually got value out of
// the app, and stays dismissed for a month if they close it.

import React, { useCallback, useEffect, useState } from "react";
import { Platform, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { usePathname } from "expo-router";
import { LINKS, openCoffee, openTipChooser } from "../utils/support";

const VISITS_KEY = "supportBarVisits";
const DISMISSED_UNTIL_KEY = "supportBarDismissedUntil";
const MIN_VISITS = 3;
const SNOOZE_DAYS = 30;

export default function SupportUsBar() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    // Nothing to ask for if no payment links are configured
    if (!LINKS.BMC_URL && !LINKS.TIP_ANY && !LINKS.TIP_5 && !LINKS.TIP_10) return;

    try {
      const dismissedUntil = Number(localStorage.getItem(DISMISSED_UNTIL_KEY) || 0);
      if (dismissedUntil > Date.now()) return;

      // Count this visit once per session
      if (!sessionStorage.getItem("supportBarCounted")) {
        const next = Number(localStorage.getItem(VISITS_KEY) || 0) + 1;
        localStorage.setItem(VISITS_KEY, String(next));
        sessionStorage.setItem("supportBarCounted", "1");
      }

      const visits = Number(localStorage.getItem(VISITS_KEY) || 0);
      if (visits >= MIN_VISITS) setVisible(true);
    } catch {
      // Private mode / storage disabled — stay quiet rather than nagging
    }
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(
        DISMISSED_UNTIL_KEY,
        String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000)
      );
    } catch {}
  }, []);

  if (Platform.OS !== "web" || !visible) return null;
  if (pathname?.startsWith("/settings")) return null; // Settings already has a support section

  // Lift above the bottom nav on the home route
  const bottom = pathname === "/" ? 76 : 12;

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <View style={styles.bar}>
        <Text style={styles.text}>Enjoying Spark Quotes?</Text>
        <View style={{ flex: 1, minWidth: 8 }} />

        {!!LINKS.BMC_URL && (
          <TouchableOpacity onPress={openCoffee} style={styles.ctaPrimary}>
            <Text style={styles.ctaPrimaryText}>Buy us a coffee ☕</Text>
          </TouchableOpacity>
        )}

        {(!!LINKS.TIP_ANY || !!LINKS.TIP_5 || !!LINKS.TIP_10) && (
          <TouchableOpacity onPress={openTipChooser} style={styles.ctaSecondary}>
            <Text style={styles.ctaSecondaryText}>Tip</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={dismiss}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Dismiss support bar"
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    alignItems: "center",
    zIndex: 20,
  },
  bar: {
    width: "100%",
    maxWidth: 980,
    backgroundColor: "rgba(20, 18, 40, 0.94)",
    borderColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  text: { color: "#C9CCE3", fontWeight: "600" },
  ctaPrimary: {
    backgroundColor: "#FFDD00",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  ctaPrimaryText: { color: "#222", fontWeight: "700" },
  ctaSecondary: {
    backgroundColor: "#6672E7",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  ctaSecondaryText: { color: "#fff", fontWeight: "700" },
  close: { paddingHorizontal: 6, paddingVertical: 4 },
  closeText: { color: "#A6ACC9", fontSize: 15 },
});
