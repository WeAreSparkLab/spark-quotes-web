import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from '../../supabaseClient'; 
import { allCategories } from "../../../app/data"; 
import { Ionicons } from "../common/Ionicons"; 
import { mockAsyncStorage } from "../../utils/mockAsyncStorage"; 
import AppStyles from "../../styles/AppStyles"; 
import { useRouter } from "expo-router";

// Define Quote interface for consistency with Supabase fetched data
interface Quote {
  id: string; // UUID from Supabase will be a string
  text: string;
  author: string;
  category: string;
}

interface IndexScreenProps {
  setScreen: (screenName: string) => void;
  refreshTrigger: boolean;
}

export default function IndexScreen({ setScreen, refreshTrigger }: IndexScreenProps) {
    const router = useRouter();
    const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [quotesPool, setQuotesPool] = useState<Quote[]>([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true);

  const fetchQuotesFromSupabase = useCallback(async () => {
    setIsLoadingQuotes(true);
    try {
      const { data, error } = await supabase
        .from('approved_quotes') // Fetch from your approved quotes table
        .select('id, text, author, category'); // Select only necessary fields

      if (error) {
        console.error("Error fetching approved quotes from Supabase:", error.message);
        console.log("Supabase fetch error details:", error); // Log full error object
        return [];
      }
      console.log("Successfully fetched quotes from Supabase:", data); // Log fetched data
      return data as Quote[];
    } catch (e: any) {
      console.error("Unexpected error during Supabase fetch:", e.message);
      return [];
    } finally {
      // Keep loading state true until fetchAndSetQuote completes processing
    }
  }, []); // No dependencies, as it fetches all approved quotes


  const fetchAndSetQuote = useCallback(async (isInitial = false) => {
    setIsLoadingQuotes(true); // Ensure loading state is set true at the start
    try {
      const allApprovedQuotes = await fetchQuotesFromSupabase();
      const storedTopics = await mockAsyncStorage.getItem("selectedTopics");
      const selectedTopics = storedTopics ? JSON.parse(storedTopics) : allCategories;

      let filteredQuotes = selectedTopics.length > 0
        ? allApprovedQuotes.filter(q => selectedTopics.includes(q.category))
        : allApprovedQuotes;

      setQuotesPool((prevPool) => {
        let tempPool = isInitial ? [] : prevPool;

        if (tempPool.length === 0) {
          tempPool = filteredQuotes.length > 0 ? filteredQuotes : allApprovedQuotes;
          console.log(`Pool refilled with ${tempPool.length} quotes.`);
        }

        if (tempPool.length > 0) {
          const randomIndex = Math.floor(Math.random() * tempPool.length);
          const newQuote = tempPool[randomIndex];
          setCurrentQuote(newQuote);
          return tempPool.filter((_, index) => index !== randomIndex);
        } else {
          setCurrentQuote({
            id: "no-quotes",
            text: "No quotes available! Try changing your topics or submit one!",
            author: "Spark App",
            category: "Info",
          });
          return [];
        }
      });
    } catch (e: any) {
      console.error("Failed to load quotes:", e.message);
      setCurrentQuote({ id: "error", text: "Failed to load quotes. Please try again later.", author: "App Error", category: "Error" });
      setQuotesPool([]);
    } finally {
      setIsLoadingQuotes(false); // Set loading to false once all processing is done
    }
  }, [fetchQuotesFromSupabase]);

  useEffect(() => {
    fetchAndSetQuote(true);
  }, [refreshTrigger, fetchAndSetQuote]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Spark Quotes</Text>
        <Text style={styles.subtitle}>Good Morning!</Text>
      </View>
      {isLoadingQuotes || !currentQuote ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#6a0dad" />
          <Text style={styles.loadingText}>Loading quotes...</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.card}>
          <View style={{ ...styles.categoryBadge, backgroundColor: "#e63946" }}>
            <Text style={styles.categoryText}>{currentQuote.category}</Text>
          </View>
          <Text style={styles.quote}>"{currentQuote.text}"</Text>
          <Text style={styles.author}>- {currentQuote.author}</Text>
        </TouchableOpacity>
      )}
      <View style={{ flex: 1 }}/>
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navButton} onPress={() => setScreen("index")}>
          <Ionicons name="sparkles" color="#FFD700"/>
          <Text style={{ ...styles.navText, color: "#6a0dad" }}>Quotes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => setScreen("topics")}>
          <Ionicons name="list" /> <Text style={styles.navText}>Topics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => router.push("submitQuote")}>
          <Ionicons name="add" /> <Text style={styles.navText}>Add Quote</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setScreen("settings")}
        >
          <Ionicons name="settings" /> <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Access AppStyles for common styles
const styles = AppStyles;
