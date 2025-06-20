import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { schedulePushNotification } from "../services/notificationService";

const frequencyOptions = ["1", "2", "3", "4", "5"];
const dayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Settings() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dailyFrequency, setDailyFrequency] = useState("1");
  const [selectedDays, setSelectedDays] = useState(dayOptions);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSaveChanges = async () => {
    // Here you would save frequency and days to AsyncStorage
    // For now, let's just schedule a notification
    await schedulePushNotification();
    router.back();
  };

  return (
    <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Notification Settings</Text>
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.settingsContainer}>
            <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Enable Notifications</Text>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: "#D1D5DB", true: "#6366F1" }}
                  thumbColor={notificationsEnabled ? "#FFFFFF" : "#9CA3AF"}
                />
              </View>
            </View>

            <View style={styles.settingCard}>
              <Text style={styles.sectionTitle}>Daily Frequency</Text>
              <View style={styles.optionsRow}>
                {frequencyOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      dailyFrequency === option && styles.selectedOption,
                    ]}
                    onPress={() => setDailyFrequency(option)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        dailyFrequency === option && styles.selectedOptionText,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingCard}>
              <Text style={styles.sectionTitle}>Active Days</Text>
              <View style={styles.daysContainer}>
                {dayOptions.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      selectedDays.includes(day) && styles.selectedDay,
                    ]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        selectedDays.includes(day) && styles.selectedDayText,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveChanges}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  backButton: { marginRight: 16 },
  title: { fontSize: 24, fontWeight: "bold", color: "#FFFFFF" },
  scrollView: { flex: 1 },
  settingsContainer: { padding: 20 },
  settingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingLabel: { fontSize: 18, fontWeight: "600", color: "#1F2937" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  optionsRow: { flexDirection: "row", justifyContent: "space-around" },
  optionButton: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 50,
    alignItems: "center",
  },
  selectedOption: { backgroundColor: "#6366F1" },
  optionText: { fontSize: 16, fontWeight: "600", color: "#6B7280" },
  selectedOptionText: { color: "#FFFFFF" },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  dayButton: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    minWidth: 45,
    alignItems: "center",
  },
  selectedDay: { backgroundColor: "#6366F1" },
  dayText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  selectedDayText: { color: "#FFFFFF" 
  },
  saveButton: {
    backgroundColor: '#6366F1',
    margin: 20,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
