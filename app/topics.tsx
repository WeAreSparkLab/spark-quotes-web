// app/topics.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { allCategories } from "../data/data";
import AppStyles from "../styles/AppStyles";
import Starfield from '../components/common/Starfield'; 

export default function Topics() {
  const router = useRouter();
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  useEffect(() => {
    // ... (Your existing logic)
    const loadSelectedTopics = async () => {
      try {
        const storedTopics = await AsyncStorage.getItem("selectedTopics");
        if (storedTopics !== null) {
          setSelectedTopics(JSON.parse(storedTopics));
        } else {
          setSelectedTopics(allCategories);
        }
      } catch (e) { console.error("Failed to load topics.", e); setSelectedTopics(allCategories); }
    };
    loadSelectedTopics();
  }, []);

  const toggleTopic = async (topic: string) => {
    // ... (Your existing logic)
    const newSelectedTopics = selectedTopics.includes(topic) ? selectedTopics.filter((t) => t !== topic) : [...selectedTopics, topic];
    setSelectedTopics(newSelectedTopics);
    try { await AsyncStorage.setItem("selectedTopics", JSON.stringify(newSelectedTopics)); } catch (e) { console.error("Failed to save topics.", e); }
  };

  const handleDone = () => { router.push("/"); };

  return (
    <View style={styles.topicsContainer}>
      <Starfield speed="slow" starCount={50} />

      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <View style={AppStyles.topicsHeader}>
          <TouchableOpacity onPress={handleDone} style={AppStyles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={AppStyles.topicsTitle}>Choose Your Topics</Text>
        </View>

        <ScrollView contentContainerStyle={styles.topicsGrid}>
          {allCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={styles.topicCardGridItem}
              onPress={() => toggleTopic(category)}
            >
              <Ionicons
                name={selectedTopics.includes(category) ? "checkbox" : "square-outline"}
                color={selectedTopics.includes(category) ? "#6672E7" : "#A0A0A0"}
                size={20}
              />
              <Text style={AppStyles.topicText}>{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  ...AppStyles,
  topicsContainer: {
    flex: 1,
    backgroundColor: '#0E0F1D',
  },
  topicsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  topicCardGridItem: {
    ...AppStyles.topicCard,
    width: "48%",
    marginBottom: 15,
  },
});
