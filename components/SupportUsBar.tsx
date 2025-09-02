// components/SupportUsBar.tsx
import React, { useEffect, useState, useCallback } from "react";
import { Platform, View, Pressable, Text, StyleSheet, Linking, TouchableOpacity } from "react-native";
import * as WebBrowser from "expo-web-browser";


const BMC_URL = process.env.EXPO_PUBLIC_BMC_URL!;
const TIP_5 = process.env.EXPO_PUBLIC_TIP_5!;
const TIP_10 = process.env.EXPO_PUBLIC_TIP_10!;

async function openExternal(url: string) {
  try {
    if (Platform.OS === "web") { window.open(url, "_blank"); return; }
    const res = await WebBrowser.openBrowserAsync(url, { showTitle: true, enableBarCollapsing: true });
    if (res.type === "dismiss" || res.type === "cancel") await Linking.openURL(url);
  } catch { await Linking.openURL(url); }
}


export default function SupportUsBar() {
const [hide, setHide] = useState(false);
const onCoffee = useCallback(() => openExternal(BMC_URL), []);
  const onTip5 = useCallback(() => openExternal(TIP_5), []);
  const onTip10 = useCallback(() => openExternal(TIP_10), []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const standalone =
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      // @ts-ignore iOS Safari
      (typeof navigator !== "undefined" && (navigator as any).standalone === true);
    setHide(standalone);
  }, []);

  if (Platform.OS !== "web" || hide) return null;

return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <Text style={styles.text}>Enjoying Spark Quotes?</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={onCoffee} style={styles.ctaPrimary}><Text style={styles.ctaPrimaryText}>Buy me a coffee</Text></TouchableOpacity>
        <TouchableOpacity onPress={onTip5}   style={styles.ctaSecondary}><Text style={styles.ctaSecondaryText}>Tip £5</Text></TouchableOpacity>
        <TouchableOpacity onPress={onTip10}  style={styles.ctaSecondary}><Text style={styles.ctaSecondaryText}>Tip £10</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12, bottom: 12, alignItems: "center" },
  bar:  { width: "100%", maxWidth: 980, backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  text: { color: "#C9CCE3" },
  ctaPrimary:   { backgroundColor: "#FFDD00", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  ctaPrimaryText: { color: "#222", fontWeight: "700" },
  ctaSecondary: { backgroundColor: "#6672E7", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginLeft: 6 },
  ctaSecondaryText: { color: "#fff", fontWeight: "700" },

})