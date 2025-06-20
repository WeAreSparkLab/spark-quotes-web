import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { allCategories } from "../../../app/data";
import { Ionicons } from "../common/Ionicons";
import { mockAsyncStorage } from "../../utils/mockAsyncStorage";
import AppStyles from "../../styles/AppStyles";


interface TopicsScreenProps {
  setScreen: (screenName: string) => void;
  setRefreshTrigger: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function TopicsScreen({ setScreen, setRefreshTrigger }: TopicsScreenProps) {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  useEffect(() => {
    const loadSelectedTopics = async () => {
      const storedTopics = await mockAsyncStorage.getItem("selectedTopics");
      setSelectedTopics(
        storedTopics ? JSON.parse(storedTopics) : allCategories
      );
    };
    loadSelectedTopics();
  }, []);

  const toggleTopic = async (topic: string) => {
    const newSelectedTopics = selectedTopics.includes(topic)
      ? selectedTopics.filter((t) => t !== topic)
      : [...selectedTopics, topic];
    setSelectedTopics(newSelectedTopics);
    await mockAsyncStorage.setItem(
      "selectedTopics",
      JSON.stringify(newSelectedTopics)
    );
  };

  const handleDone = () => {
    setRefreshTrigger((prev) => !prev);
    setScreen("index");
  };

  return (
    <View style={styles.topicsContainer}>
      <View style={styles.topicsHeader}>
        <TouchableOpacity onPress={handleDone} style={styles.backButton}>
          <Ionicons name="arrow-back" color="#FFFFFF" size={24} /> {/* Explicitly set color to white */}
        </TouchableOpacity>
        <Text style={styles.topicsTitle}>Choose Your Topics</Text>
      </View>
      <View style={styles.topicsList}>
        {allCategories.map((category) => (
          <TouchableOpacity
            key={category}
            style={styles.topicCard}
            onPress={() => toggleTopic(category)}
          >
            <Ionicons
              name={
                selectedTopics.includes(category)
                  ? "checkbox"
                  : "square-outline"
              }
              color={selectedTopics.includes(category) ? "#6672E7" : "#A0A0A0"}
              size={20}
            />
            <Text style={styles.topicText}>{category}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = AppStyles;
