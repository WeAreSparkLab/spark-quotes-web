import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "../common/Ionicons";
import { mockAsyncStorage } from "../../utils/mockAsyncStorage";
import { schedulePushNotification } from "../../utils/schedulePushNotification";
import { Switch } from "../common/Switch";
import { supabase } from '../../supabaseClient';
import AppStyles from "../../styles/AppStyles";


const frequencyOptions = ["1", "2", "3", "4", "5"];
const dayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface SettingsScreenProps {
  setScreen: (screenName: string) => void;
}

export default function SettingsScreen({ setScreen }: SettingsScreenProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dailyFrequency, setDailyFrequency] = useState("1");
  const [selectedDays, setSelectedDays] = useState<string[]>(dayOptions);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setScreen("index");
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedNotificationsEnabled = await mockAsyncStorage.getItem(
          "notificationsEnabled"
        );
        if (storedNotificationsEnabled !== null) {
          setNotificationsEnabled(JSON.parse(storedNotificationsEnabled));
        }
        const storedDailyFrequency = await mockAsyncStorage.getItem(
          "dailyFrequency"
        );
        if (storedDailyFrequency !== null) {
          setDailyFrequency(storedDailyFrequency);
        }
        const storedSelectedDays = await mockAsyncStorage.getItem(
          "selectedDays"
        );
        if (storedSelectedDays !== null) {
          setSelectedDays(JSON.parse(storedSelectedDays));
        }
      } catch (e) {
        console.error("Failed to load settings.", e);
      }
    };
    loadSettings();
  }, []);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSaveChanges = async () => {
    try {
      await mockAsyncStorage.setItem(
        "notificationsEnabled",
        JSON.stringify(notificationsEnabled)
      );
      await mockAsyncStorage.setItem("dailyFrequency", dailyFrequency);
      await mockAsyncStorage.setItem(
        "selectedDays",
        JSON.stringify(selectedDays)
      );
      if (notificationsEnabled) {
        schedulePushNotification(dailyFrequency, selectedDays);
      }
    } catch (e) {
      console.error("Failed to save settings.", e);
    }
    setScreen("index");
  };

  return (
    <View style={styles.settingsContainer}>
      <View style={styles.topicsHeader}>
        <TouchableOpacity onPress={() => setScreen("index")} style={styles.backButton}>
          <Ionicons name="arrow-back" color="#FFFFFF" size={24} /> {/* Explicitly set color to white */}
        </TouchableOpacity>
        <Text style={styles.topicsTitle}>Notification Settings</Text>
      </View>
      <View style={styles.scrollView}>
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>Enable Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: "#D1D5DB", true: "#6672E7" }}
            thumbColor={"#FFFFFF"}
          />
        </View>
        <View style={styles.settingCard}>
          <Text style={styles.sectionTitle}>Daily Frequency</Text>
          <View style={styles.optionsRow}>
            {frequencyOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={{
                  ...styles.optionButton,
                  ...(dailyFrequency === option && styles.selectedOption),
                }}
                onPress={() => setDailyFrequency(option)}
              >
                <Text
                  style={{
                    ...styles.optionText,
                    ...(dailyFrequency === option && styles.selectedOptionText),
                  }}
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
                style={{
                  ...styles.dayButton,
                  ...(selectedDays.includes(day) && styles.selectedDay),
                }}
                onPress={() => toggleDay(day)}
              >
                <Text
                  style={{
                    ...styles.dayText,
                    ...(selectedDays.includes(day) && styles.selectedDayText),
                  }}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = AppStyles;
