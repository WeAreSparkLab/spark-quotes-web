// app/settings.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Switch from "../components/common/Switch";
import { schedulePushNotification } from "../utils/schedulePushNotification";
import { supabase } from "../supabaseClient";
import { useSupabase } from "./_layout";

const frequencyOptions = ["1", "2", "3", "4", "5"];
const dayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const timeOptions = ["Morning", "Afternoon", "Night"];

const PRIVACY_POLICY_URL = "https://wearesparklab.com/privacy";

export default function Settings() {
  const router = useRouter();
  const { session } = useSupabase(); // know if user is logged in

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dailyFrequency, setDailyFrequency] = useState("1");
  const [selectedDays, setSelectedDays] = useState<string[]>(dayOptions);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(["Morning"]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedEnabled = await AsyncStorage.getItem("notificationsEnabled");
        if (storedEnabled !== null)
          setNotificationsEnabled(JSON.parse(storedEnabled));

        const storedFrequency = await AsyncStorage.getItem("dailyFrequency");
        if (storedFrequency !== null) setDailyFrequency(storedFrequency);

        const storedDays = await AsyncStorage.getItem("selectedDays");
        if (storedDays !== null) setSelectedDays(JSON.parse(storedDays));

        const storedTimes = await AsyncStorage.getItem("selectedTimes");
        if (storedTimes !== null) setSelectedTimes(JSON.parse(storedTimes));
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

  const toggleTime = (time: string) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const handleSaveChanges = async () => {
    try {
      await AsyncStorage.setItem(
        "notificationsEnabled",
        JSON.stringify(notificationsEnabled)
      );
      await AsyncStorage.setItem("dailyFrequency", dailyFrequency);
      await AsyncStorage.setItem("selectedDays", JSON.stringify(selectedDays));
      await AsyncStorage.setItem("selectedTimes", JSON.stringify(selectedTimes));

      if (notificationsEnabled) {
        await schedulePushNotification(
          dailyFrequency,
          selectedDays,
          selectedTimes
        );
      }
      router.back();
    } catch (e) {
      console.error("Failed to save settings.", e);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSignIn = () => {
    router.push("/auth");
  };

  const openPrivacy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert("Error", "Could not open Privacy Policy.");
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete account",
      "This permanently deletes your account and related data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: deleteAccount },
      ]
    );
  };

  const deleteAccount = async () => {
    if (!session?.user) return;
    setDeleting(true);
    try {
      // calls the Supabase Edge Function you’ll add below
      const { error } = await supabase.functions.invoke("delete-account", {
        body: {}, // nothing needed; function reads the JWT for user id
      });
      if (error) throw error;

      // sign out locally after server deletion
      await supabase.auth.signOut();
      Alert.alert("Account deleted", "Your account has been removed.");
      router.replace("/");
    } catch (e: any) {
      console.error("Delete account failed:", e?.message ?? e);
      Alert.alert(
        "Could not delete",
        "Please try again later or contact support."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.settingsContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollView}>
        <View className="notifications" style={styles.settingCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.settingLabel}>Enable Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: "#D1D5DB", true: "#6672E7" }}
              thumbColor={"#FFFFFF"}
            />
          </View>
        </View>

        <View className="frequency" style={styles.settingCard}>
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

        <View className="time-of-day" style={styles.settingCard}>
          <Text style={styles.sectionTitle}>Time of Day</Text>
          <View style={styles.optionsRow}>
            {timeOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  selectedTimes.includes(option) && styles.selectedOption,
                ]}
                onPress={() => toggleTime(option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedTimes.includes(option) && styles.selectedOptionText,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="days" style={styles.settingCard}>
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

        {/* --- App Info & Privacy --- */}
        <View className="privacy" style={styles.settingCard}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <TouchableOpacity style={styles.linkButton} onPress={openPrivacy}>
            <Text style={styles.linkButtonText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        {/* --- Auth section --- */}
        <View className="account" style={styles.settingCard}>
          <Text style={styles.sectionTitle}>Account</Text>

          {session ? (
            <>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                disabled={deleting}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete Account</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.loginButton} onPress={handleSignIn}>
              <Text style={styles.loginButtonText}>Sign In / Create Account</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  settingsContainer: { flex: 1, backgroundColor: "#0E0F1D" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: { marginRight: 16 },
  title: { fontSize: 22, fontWeight: "bold", color: "#FFFFFF" },
  scrollView: { paddingHorizontal: 15, paddingBottom: 20 },
  settingCard: {
    backgroundColor: "#222034",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  settingLabel: { fontSize: 16, fontWeight: "600", color: "#E0E0E0" },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#E0E0E0", marginBottom: 12 },
  optionsRow: { flexDirection: "row", justifyContent: "space-around" },
  optionButton: {
    backgroundColor: "#4D637D",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 40,
    alignItems: "center",
    marginHorizontal: 4,
  },
  selectedOption: { backgroundColor: "#6672E7" },
  optionText: { fontSize: 14, fontWeight: "600", color: "#B0B0B0" },
  selectedOptionText: { color: "#FFFFFF" },
  daysContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start" },
  dayButton: {
    backgroundColor: "#4D637D",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
    marginRight: 8,
    minWidth: 40,
    alignItems: "center",
  },
  selectedDay: { backgroundColor: "#6672E7" },
  dayText: { fontSize: 12, fontWeight: "600", color: "#B0B0B0" },
  selectedDayText: { color: "#FFFFFF" },
  saveButton: {
    backgroundColor: "#6672E7",
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  loginButton: {
    backgroundColor: "#4D637D",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginTop: 4,
  },
  loginButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  logoutButton: {
    backgroundColor: "#6672E7",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginTop: 4,
  },
  logoutButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  linkButton: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  linkButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  deleteButton: {
    backgroundColor: "#E63946",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginTop: 8,
  },
  deleteButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});