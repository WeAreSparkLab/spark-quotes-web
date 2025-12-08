// components/InstallPrompt.tsx
import React, { useEffect, useState } from "react";
import { Platform, View, Text, TouchableOpacity } from "react-native";

// we'll stash the event on window so other screens (Settings) can use it
declare global {
  interface Window { __deferredPWA?: any }
}

export default function InstallPrompt() {
  const [eventRef, setEventRef] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
  if (Platform.OS !== "web") return;

    const standalone =
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    // @ts-ignore iOS Safari
    ((navigator as any)?.standalone === true);
  setIsStandalone(standalone);


    const alreadyDismissed =
      typeof localStorage !== "undefined" &&
      localStorage.getItem("pwa-install-dismissed") === "1";

    const onBeforeInstall = (e: any) => {
      e.preventDefault?.();
      setEventRef(e);
      (window as any).__deferredPWA = e;
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
  try {
    eventRef.prompt?.(); 
    if (eventRef.userChoice) {
      await eventRef.userChoice;
    }
  } catch (e) {
    console.log('PWA install prompt error', e);
  } finally {
    setVisible(false);
    try { localStorage.setItem('pwa-install-dismissed', '1'); } catch {}
    setEventRef(null);
    (window as any).__deferredPWA = null;
  }
};

  const handleClose = () => {
    setVisible(false);
    try { localStorage.setItem("pwa-install-dismissed", "1"); } catch {}
  };

  return (
    <View style={{ position: "fixed" as any, top: 0, left: 0, right: 0, zIndex: 30, alignItems: "center", paddingTop: 12, paddingHorizontal: 12, backgroundColor: "rgba(12, 10, 26, 0.95)", backdropFilter: "blur(10px)" } as any}>
      <View
        style={{
          width: "100%",
          maxWidth: 980,
          backgroundColor: "rgba(102, 114, 231, 0.15)",
          borderColor: "rgba(102, 114, 231, 0.3)",
          borderWidth: 1,
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
          shadowColor: "#6672E7",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        } as any}
      >
        <Text style={{ color: "#C9CCE3", flexShrink: 1 }}>
          Install <Text style={{ fontWeight: "800", color: "#FFFFFF" }}>Spark Quotes</Text> for a full-screen experience.
        </Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleInstall} style={{ backgroundColor: "#6672E7", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, shadowColor: "#6672E7", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4 }}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Install</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleClose} style={{ marginLeft: 6, padding: 6 }}>
          <Text style={{ color: "#A6ACC9" }}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
