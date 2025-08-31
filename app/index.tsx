// app/index.tsx
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, Text, StyleSheet, Platform } from "react-native";
import IndexScreen from "../components/screens/IndexScreen";
import { useSupabase } from "./_layout";
import InstallPrompt from "../components/InstallPrompt";
import ResponsivePage from "../components/layout/ResponsivePage";


export default function App() {
  const { supabaseInitialized } = useSupabase();

  if (!supabaseInitialized) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6672E7" />
        <Text style={styles.loadingText}>Initializing app...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.appContainer} edges={["top"]}>
      <ResponsivePage maxWidth={980} padding={20}>
        <InstallPrompt />
        <IndexScreen />
        {Platform.OS === "web" ? <InstallPrompt /> : null}
      </ResponsivePage>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1, backgroundColor: "#0E0F1D" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0E0F1D" },
  loadingText: { color: "#E0E0E0", marginTop: 10 },
});
