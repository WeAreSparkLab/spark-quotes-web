// components/layout/ResponsivePage.tsx
import React from "react";
import { Platform, View } from "react-native";

export default function ResponsivePage({
  children,
  maxWidth = 980,
  padding = 20,
}: { children: React.ReactNode; maxWidth?: number; padding?: number }) {
  if (Platform.OS !== "web") {
    // Native: full-bleed, no gutters
    return <View style={{ flex: 1, paddingHorizontal: 0, paddingVertical: 0 }}>{children}</View>;
  }
  // Web: centered, constrained width
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View style={{ width: "100%", maxWidth, padding }}>{children}</View>
    </View>
  );
}

