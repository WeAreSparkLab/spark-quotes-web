// components/InstallPrompt.tsx
import React, { useEffect, useState } from "react";
import { Platform, View, Text, TouchableOpacity } from "react-native";
import { C, F } from "../styles/theme";

// we'll stash the event on window so other screens (Settings) can use it
declare global {
  interface Window { __deferredPWA?: any }
}

export default function InstallPrompt({ onVisibleChange }: { onVisibleChange?: (showing: boolean) => void } = {}) {
  const [eventRef, setEventRef] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // The banner is fixed to the top of the window; let the screen underneath
  // know when to leave room for it.
  const showing = Platform.OS === "web" && !isStandalone && visible;
  useEffect(() => {
    onVisibleChange?.(showing);
  }, [showing, onVisibleChange]);

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
    <View style={{ position: "fixed" as any, top: 0, left: 0, right: 0, zIndex: 30, alignItems: "center", paddingTop: 12, paddingHorizontal: 12, backgroundColor: "transparent" } as any}>
      <View
        style={{
          width: "100%",
          maxWidth: 640,
          backgroundColor: "rgba(34, 28, 43, 0.95)",
          borderColor: "rgba(247, 243, 237, 0.14)",
          borderWidth: 1,
          borderRadius: 18,
          paddingVertical: 10,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 16,
        } as any}
      >
        <Text style={{ color: "#F7F3ED", flexShrink: 1, fontFamily: F.sans }}>
          Add <Text style={{ fontWeight: "600" }}>Spark Quotes</Text> to your home screen
        </Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleInstall} accessibilityRole="button" style={{ backgroundColor: C.gold, paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999 }}>
          <Text style={{ color: C.ink, fontWeight: "600", fontSize: 15, fontFamily: F.sans }}>Install</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleClose} accessibilityRole="button" accessibilityLabel="Dismiss install banner" style={{ marginLeft: 2, padding: 6 }}>
          <Text style={{ color: "#CFC5D9" }}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
