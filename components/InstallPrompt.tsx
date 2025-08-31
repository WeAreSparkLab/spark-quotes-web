// components/InstallPrompt.tsx
import React, { useEffect, useState } from "react";
import { Platform, View, Pressable, Text, StyleSheet } from "react-native";

// we'll stash the event on window so other screens (Settings) can use it
declare global {
  interface Window { __deferredPWA?: any }
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const onBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      window.__deferredPWA = e;
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt as any);
    // show again if we already caught it earlier
    if (window.__deferredPWA) setVisible(true);

    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt as any);
  }, []);

  if (Platform.OS !== "web" || !visible) return null;

  const handleInstall = async () => {
    const dp = window.__deferredPWA;
    if (!dp) return;
    dp.prompt();
    await dp.userChoice;
    window.__deferredPWA = undefined;
    setVisible(false);
  };

  return (
    <View style={styles.bar}>
      <Text style={styles.msg}>
        Install <Text style={{ fontWeight: "800" }}>Spark Quotes</Text> for a full-screen experience.
      </Text>
      <Pressable onPress={handleInstall} style={styles.btn}>
        <Text style={styles.btnText}>Install app</Text>
      </Pressable>
      <Pressable onPress={() => setVisible(false)} style={styles.close}>
        <Text style={{ color: "#9aa3ff" }}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "fixed",
    top: 8,
    left: 12,
    right: 12,
    zIndex: 1000,
    backgroundColor: "rgba(14,15,29,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  msg: { color: "#E7E9FF", flex: 1, fontSize: 14 },
  btn: {
    backgroundColor: "#7D86FF",
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10
  },
  btnText: { color: "white", fontWeight: "700" },
  close: { paddingHorizontal: 8, paddingVertical: 4 }
});
