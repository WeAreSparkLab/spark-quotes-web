// components/SupportUsBar.tsx
import React, { useEffect, useState } from "react";
import { Platform, View, Pressable, Text, StyleSheet, Linking } from "react-native";

const SUPPORT_URL = "https://wearesparklab.com/support";
const BOTTOM_OFFSET = 80; 

export default function SupportUsBar() {
const [hide, setHide] = useState(false);

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
    <View pointerEvents="box-none">
      <View style={[styles.wrap, { position: "fixed" as any }]}>
        <Pressable
          onPress={() => Linking.openURL(SUPPORT_URL)}
          style={({ pressed }) => [styles.chip, pressed && { opacity: 0.9 }]}
          accessibilityRole="button"
          accessibilityLabel="Support Spark Quotes"
        >
          <Text style={styles.text}>
            Independent & ad-light. <Text style={styles.link}>Support us.</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { left: 0, right: 0, bottom: BOTTOM_OFFSET, zIndex: 999, alignItems: "center" },
  chip: {
    backgroundColor: "rgba(16,14,30,0.85)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  text: { color: "#D6DAFF", fontSize: 14, fontWeight: "600", letterSpacing: 0.2 },
  link: { color: "#B5BFFF", textDecorationLine: "underline" },
});
