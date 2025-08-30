// app/index.tsx
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, Text, StyleSheet } from "react-native";
import IndexScreen from "../components/screens/IndexScreen";
import { useSupabase } from "./_layout";
import InstallPrompt from "../components/InstallPrompt";


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
      <InstallPrompt />
      <IndexScreen />
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    flexDirection: "column",
    height: "100%",
    fontFamily: "sans-serif",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0E0F1D",
  },
  loadingText: {
    color: "#E0E0E0",
    marginTop: 10,
  },
});
