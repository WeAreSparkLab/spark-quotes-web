// components/common/PageHeader.tsx
//
// The top of every paper page: a way back, the page name, and an optional
// line underneath. Back always works, even when the page was opened directly
// (no history), by falling back to Home.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "./Ionicons";
import { C, F, S } from "../../styles/theme";

export default function PageHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) {
  const router = useRouter();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")));

  return (
    <View style={[S.column, styles.wrap]}>
      <Pressable
        onPress={back}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={10}
        style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Ionicons name="arrow-back" size={20} color={C.ink} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <Text accessibilityRole="header" aria-level={1} style={S.h1}>{title}</Text>
      {subtitle ? <Text style={[S.body, styles.sub]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 18, paddingBottom: 14 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 6, marginBottom: 10 },
  backText: { fontFamily: F.sans, color: C.ink, fontSize: 14.5, fontWeight: "600" },
  sub: { marginTop: 6 },
});
