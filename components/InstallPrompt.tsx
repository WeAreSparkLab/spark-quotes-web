// components/InstallPrompt.tsx
import React, { useEffect, useState } from "react";
import { Platform, View, Pressable, Text, StyleSheet, TouchableOpacity } from "react-native";

// we'll stash the event on window so other screens (Settings) can use it
declare global {
  interface Window { __deferredPWA?: any }
}

export default function InstallPrompt() {
  const [eventRef, setEventRef] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const [eventRef, setEventRef] = useState<any>(null);
    const [visible, setVisible] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    // detect standalone (iOS + other)
    const standalone =
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      // @ts-ignore iOS Safari
      (typeof navigator !== "undefined" && (navigator as any).standalone === true);
    setIsStandalone(standalone);

    const alreadyDismissed = localStorage.getItem("pwa-install-dismissed") === "1";

    const onBeforeInstall = (e: any) => {
      e.preventDefault();
      setEventRef(e);
      if (!alreadyDismissed) setVisible(true);
    };
    const onInstalled = () => setVisible(false);

    window.addEventListener("beforeinstallprompt", onBeforeInstall as any);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as any);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (Platform.OS !== "web" || isStandalone || !visible) return null;

  const handleInstall = async () => {
    if (!eventRef) return;
    eventRef.prompt();
    await eventRef.userChoice;
    setVisible(false);
    localStorage.setItem("pwa-install-dismissed", "1");
    setEventRef(null);
  };

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem("pwa-install-dismissed", "1");
  };

  return (
    <View style={{ position: "fixed" as any, top: 12, left: 12, right: 12, zIndex: 30, alignItems: "center" }}>
      <View
        style={{
          width: "100%",
          maxWidth: 980,
          backgroundColor: "rgba(255,255,255,0.06)",
          borderColor: "rgba(255,255,255,0.12)",
          borderWidth: 1,
          borderRadius: 12,
          paddingVertical: 10,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        } as any}
      >
        <Text style={{ color: "#C9CCE3", flexShrink: 1 }}>
          Install <Text style={{ fontWeight: "800", color: "#FFFFFF" }}>Spark Quotes</Text> for a full-screen experience.
        </Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleInstall} style={{ backgroundColor: "#6672E7", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Install app</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleClose} style={{ marginLeft: 6, padding: 6 }}>
          <Text style={{ color: "#A6ACC9" }}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}