import React, { useState } from "react";
import { Stack, useRouter } from "expo-router";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";

// Import screens
import IndexScreen from "./components/screens/IndexScreen";
import TopicsScreen from "./components/screens/TopicsScreen";
import SettingsScreen from "./components/screens/SettingsScreen";
import SubmitQuoteScreen from "./components/screens/SubmitQuoteScreen";
import AuthScreen from "./components/screens/AuthScreen";

// Import Supabase context
import { useSupabase } from './_layout';


export default function App() {
  const { session, supabaseInitialized } = useSupabase();
  const [currentScreen, setCurrentScreen] = useState("index"); // State for current screen
  const [refreshTrigger, setRefreshTrigger] = useState(false); // Used to trigger data refresh on IndexScreen

  // Show loading indicator until Supabase is initialized
  if (!supabaseInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6672E7" />
        <Text style={styles.loadingText}>Initializing app...</Text>
      </View>
    );
  }

  // Render AuthScreen if no session, otherwise render the main app content
  if (!session) {
    return <AuthScreen />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case "topics": return (<TopicsScreen setScreen={setCurrentScreen} setRefreshTrigger={setRefreshTrigger}/>);
      case "submitQuote": return (<SubmitQuoteScreen setScreen={setCurrentScreen}/>);
      case "settings": return (<SettingsScreen setScreen={setCurrentScreen}/>);
      case "index": default: return (<IndexScreen setScreen={setCurrentScreen} refreshTrigger={refreshTrigger}/>);
    }
  };

  return (
    <View style={styles.appContainer}>
      <Stack.Screen options={{ headerShown: false }}/>
      {renderScreen()}
    </View>
  );
}

// Global/Base Styles for App Container and Loading State
const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    flexDirection: "column",
    height: "100%", // Retain for web compatibility
    fontFamily: "sans-serif", // Retain for web compatibility
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0E0F1D',
  },
  loadingText: {
    color: '#E0E0E0',
    marginTop: 10,
  },
});
