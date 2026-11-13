// app/topics.tsx
import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { allCategories, legacyCategoryMap } from "../data/data";
import PageHeader from "../components/common/PageHeader";
import { Ionicons } from "../components/common/Ionicons";
import { C, F, S } from "../styles/theme";

export default function Topics() {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const storedTopics = await AsyncStorage.getItem("selectedTopics");
        if (storedTopics !== null) {
          // Migrate renamed topics and drop retired ones so the choices
          // reflect what actually exists
          const normalised: string[] = JSON.parse(storedTopics)
            .map((t: string) => legacyCategoryMap[t] ?? t)
            .filter((t: string) => allCategories.includes(t));
          setSelectedTopics(normalised.length > 0 ? normalised : allCategories);
        } else {
          setSelectedTopics(allCategories);
        }
      } catch (e) {
        console.error("Failed to load topics.", e);
        setSelectedTopics(allCategories);
      }
    })();
  }, []);

  const save = async (next: string[]) => {
    setSelectedTopics(next);
    try { await AsyncStorage.setItem("selectedTopics", JSON.stringify(next)); } catch (e) { console.error("Failed to save topics.", e); }
  };

  const toggleTopic = (topic: string) =>
    save(selectedTopics.includes(topic) ? selectedTopics.filter((t) => t !== topic) : [...selectedTopics, topic]);

  const all = selectedTopics.length === allCategories.length;

  return (
    <SafeAreaView style={S.page}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <PageHeader title="Your topics" subtitle="Your daily quote is drawn from the topics you pick here. Choose as many as you like." />

        <View style={S.column}>
          <View style={styles.bar}>
            <Text style={S.eyebrow}>{selectedTopics.length} of {allCategories.length} chosen</Text>
            <Pressable onPress={() => save(all ? [] : allCategories)} accessibilityRole="button" hitSlop={8}>
              <Text style={S.link}>{all ? "Clear all" : "Choose all"}</Text>
            </Pressable>
          </View>

          <View style={styles.grid} role="group" aria-label="Topics">
            {allCategories.map((category) => {
              const on = selectedTopics.includes(category);
              return (
                <Pressable
                  key={category}
                  onPress={() => toggleTopic(category)}
                  role="checkbox"
                  aria-checked={on}
                  accessibilityLabel={category}
                  style={({ pressed }) => [S.chip, styles.chip, on && S.chipOn, { opacity: pressed ? 0.75 : 1 }]}
                >
                  {on ? <Ionicons name="checkmark" size={15} color={C.accent} /> : null}
                  <Text style={[S.chipText, on && S.chipTextOn]}>{category}</Text>
                </Pressable>
              );
            })}
          </View>

          {selectedTopics.length === 0 ? (
            <Text style={[S.body, styles.note]}>With nothing chosen, you'll get quotes from every topic.</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", gap: 6, minHeight: 42, paddingHorizontal: 16 },
  note: { marginTop: 16, fontFamily: F.sans },
});
