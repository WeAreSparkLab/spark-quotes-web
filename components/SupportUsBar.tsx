// components/SupportUsBar.tsx
import React from "react";
import { Platform, View, Pressable, Text, StyleSheet, Linking } from "react-native";

const SUPPORT_URL = "https://wearesparklab.com/support";
const BOTTOM_OFFSET = 80; // keep above your tab bar; tweak if needed

export default function SupportUsBar() {
  const fixedPos =
    Platform.OS === "web"
      ? ({ position: "fixed", left: 0, right: 0 } as const)
      : ({ position: "absolute", left: 0, right: 0 } as const);

  return (
    <View pointerEvents="box-none">
      <View style={[styles.wrap, fixedPos]}>
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
  wrap: {
    bottom: BOTTOM_OFFSET,
    zIndex: 999,
    alignItems: "center", // << stays centered regardless of width
  },
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
  text: {
    color: "#D6DAFF",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  link: {
    color: "#B5BFFF",
    textDecorationLine: "underline",
  },
});
