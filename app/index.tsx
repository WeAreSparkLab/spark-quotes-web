// index.tsx
import React, { useState, useEffect } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Text, StyleSheet, View  } from "react-native";
import IndexScreen from "../components/screens/IndexScreen";
import AuthScreen from "../components/screens/AuthScreen";
import { useSupabase } from './_layout';


export default function App() {
  const { session, supabaseInitialized } = useSupabase();

  // Show loading indicator until Supabase is initialized
  if (!supabaseInitialized) {
    return (
      // Use SafeAreaView for the loading container as well
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6672E7" />
        <Text style={styles.loadingText}>Initializing app...</Text>
      </SafeAreaView>
    );
  }

  // Render AuthScreen if no session
  if (!session) {
  return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <AuthScreen />
      </SafeAreaView>
    );
  }

  // If a session exists, render the IndexScreen.
  // Navigation is now handled by expo-router.
  return (
    <SafeAreaView style={styles.appContainer} edges={['top']}>
      <IndexScreen />
    </SafeAreaView>
  );
}

// Global/Base Styles for App Container and Loading State
const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    flexDirection: "column",
    height: "100%", 
    fontFamily: "sans-serif", 
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
