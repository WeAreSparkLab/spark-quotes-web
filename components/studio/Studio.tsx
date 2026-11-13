// components/studio/Studio.tsx
//
// Native fallback: there is no canvas on native, so offer the plain text
// share the app has always had. The full studio is Studio.web.tsx.

import React from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PageHeader from "../common/PageHeader";
import { C, S } from "../../styles/theme";
import { shareQuote } from "../../utils/shareQuote";
import { useStudioQuote } from "./useStudioQuote";

export default function Studio() {
  const { quote, state } = useStudioQuote();
  return (
    <SafeAreaView style={S.page}>
      <PageHeader title="Share" />
      <View style={S.column}>
        {state === "ready" && quote ? (
          <View style={S.card}>
            <Text style={S.h2}>{"“"}{quote.text}{"”"}</Text>
            <Pressable onPress={() => shareQuote(quote)} accessibilityRole="button" style={[S.btn, S.btnPrimary, { marginTop: 16 }]}>
              <Text style={S.btnPrimaryText}>Share</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={[S.body, { color: C.inkSoft }]}>{state === "loading" ? "Loading…" : "That quote couldn't be found."}</Text>
        )}
      </View>
    </SafeAreaView>
  );
}
