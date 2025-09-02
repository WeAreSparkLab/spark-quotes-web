// components/screens/IndexScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../supabaseClient.native";
import { allCategories } from "../../data/data";
import { Ionicons } from "../common/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppStyles from "../../styles/AppStyles";
import { useRouter, useFocusEffect } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import Starfield from "../common/Starfield";
import { useSupabase } from "../../app/_layout";
import {
  addFavoriteQuote,
  removeFavoriteQuote,
  isQuoteFavorited,
} from "../../services/supabaseFavorites";
import { openLink } from '../../utils/openLink';


interface Quote {
  id: string;
  text: string;
  author: string;
  category: string;
}

// Local fallback so the app never looks "broken" if network/db is empty
const FALLBACK_QUOTES: Quote[] = [
  { id: "f1", text: "Keep going. You’re closer than you think.", author: "Unknown", category: "Good Vibes" },
  { id: "f2", text: "Small steps every day.", author: "Unknown", category: "Discipline" },
  { id: "f3", text: "Progress over perfection.", author: "Unknown", category: "Mindset" },
];

export default function IndexScreen() {
  const router = useRouter();
  const { userId } = useSupabase();

  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  // Floating card micro animation
  const cardAnimation = useSharedValue(0);
  useEffect(() => {
    cardAnimation.value = withRepeat(withTiming(1, { duration: 12000 }), -1, true);
  }, [cardAnimation]);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(cardAnimation.value, [0, 1], [0, -8]);
    return { transform: [{ translateY }] };
  });

  const pickFallback = () =>
    FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];

  const getQuoteOfTheDay = useCallback(async () => {
    setIsLoading(true);
    const today = new Date().toISOString().split("T")[0];

    try {
      // 1) Use cached “quote of the day” if same day
      const storedQuoteData = await AsyncStorage.getItem("quoteOfTheDay");
      if (storedQuoteData) {
        const { quote, date } = JSON.parse(storedQuoteData);
        if (date === today) {
          setCurrentQuote(quote);
          return;
        }
      }

      // 2) Get selected topics (or all)
      const storedTopics = await AsyncStorage.getItem("selectedTopics");
      const selectedTopics: string[] = storedTopics ? JSON.parse(storedTopics) : allCategories;

      // 3) Try Supabase first
      const { data, error } = await supabase
        .from("approved_quotes")
        .select("id, text, author, category")
        .in("category", selectedTopics.length > 0 ? selectedTopics : allCategories);

      let newQuote: Quote | null = null;

      if (!error && data && data.length > 0) {
        newQuote = data[Math.floor(Math.random() * data.length)] as Quote;
      } else {
        // 4) Fallback if network/table empty
        newQuote = pickFallback();
      }

      setCurrentQuote(newQuote);

      // 5) Cache for the day so app is instant next launch
      await AsyncStorage.setItem("quoteOfTheDay", JSON.stringify({ quote: newQuote, date: today }));
    } catch {
      const fb = pickFallback();
      setCurrentQuote(fb);
      await AsyncStorage.setItem("quoteOfTheDay", JSON.stringify({ quote: fb, date: today }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Keep favorite heart state in sync when quote/user changes
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (userId && currentQuote?.id) {
        const favorited = await isQuoteFavorited(userId, currentQuote.id);
        setIsFavorited(favorited);
      } else {
        setIsFavorited(false);
      }
    };
    checkFavoriteStatus();
  }, [userId, currentQuote?.id]);

  // --- Add back this: Favorite toggle handler
  const handleFavoriteToggle = async () => {
    if (!userId) {
      alert("Please log in to favorite quotes!");
      return;
    }
    if (!currentQuote?.id) return;

    let success: boolean;
    if (isFavorited) {
      success = await removeFavoriteQuote(userId, currentQuote.id);
      if (success) setIsFavorited(false);
    } else {
      success = await addFavoriteQuote(userId, currentQuote.id);
      if (success) setIsFavorited(true);
    }
    if (!success) {
      alert("Failed to update favorite status.");
    }
  };

  // --- Simple UGC “Report” action (stores a report row)
  const handleReport = async () => {
    if (!currentQuote?.id) return;
    try {
      await supabase.from("quote_reports").insert({
        quote_id: currentQuote.id,
        reason: "inappropriate",
        reported_by_user_id: userId ?? null,
      });
      alert("Thanks — report submitted.");
    } catch {
      alert("Could not submit report. Please try again later.");
    }
  };

  useFocusEffect(
    useCallback(() => {
      getQuoteOfTheDay();
    }, [getQuoteOfTheDay])
  );

  return (
    <SafeAreaView style={styles.sceneContainer} edges={["top"]}>
      <Starfield speed="fast" starCount={100} />

      <View style={{ flex: 1, zIndex: 1 }}>
        <View style={[AppStyles.header, { backgroundColor: "#0C0A1A" }]}>
          <Text style={styles.sceneTitle}>Spark Quotes</Text>
          <Text style={styles.sceneSubtitle}>Your Quote of the Day</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContentContainer} alwaysBounceVertical={false}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : currentQuote ? (
            <>
              <Image
                source={require("../../assets/images/star-icon.jpg")}
                style={styles.starImage}
              />
              <Animated.View style={[styles.quoteCard, cardAnimatedStyle]}>
                {/* Category badge */}
                <View style={[AppStyles.categoryBadge, { backgroundColor: "#e63946" }]}>
                  <Text style={AppStyles.categoryText}>{currentQuote.category}</Text>
                </View>

                {/* Report (UGC) */}
                <TouchableOpacity onPress={handleReport} style={styles.reportButton}>
                  <Ionicons name="flag-outline" size={22} color="#9B9B9B" />
                  <Text style={styles.reportText}>Report</Text>
                </TouchableOpacity>

                {/* Favorite (requires login) */}
                {userId && (
                  <TouchableOpacity onPress={handleFavoriteToggle} style={styles.favoriteButton}>
                    <Ionicons
                      name={isFavorited ? "heart" : "heart-outline"}
                      size={30}
                      color={isFavorited ? "#E74C3C" : "#9B9B9B"}
                    />
                  </TouchableOpacity>
                )}

                <Text style={styles.quoteText}>"{currentQuote.text}"</Text>
                <Text style={styles.authorText}>- {currentQuote.author}</Text>
              </Animated.View>
            </>
          ) : null}
        </ScrollView>

        {/* Bottom nav with its own bottom safe-area */}
        <SafeAreaView edges={["bottom"]} style={styles.navBar}>
          <TouchableOpacity style={AppStyles.navButton} onPress={() => router.push("/topics")}>
            <Ionicons name="list" color="#FFFFFF" size={24} />
            <Text style={styles.navText}>Topics</Text>
          </TouchableOpacity>

          <TouchableOpacity style={AppStyles.navButton} onPress={() => router.push("/favorites")}>
            <Ionicons name="heart" color="#FFFFFF" size={24} />
            <Text style={styles.navText}>Favorites</Text>
          </TouchableOpacity>

          <TouchableOpacity style={AppStyles.navButton} onPress={() => router.push("/submitQuote")}>
            <Ionicons name="add" color="#FFFFFF" size={24} />
            <Text style={styles.navText}>Add Quote</Text>
          </TouchableOpacity>

          <TouchableOpacity style={AppStyles.navButton} onPress={() => router.push("/settings")}>
            <Ionicons name="settings" color="#FFFFFF" size={24} />
            <Text style={styles.navText}>Settings</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    backgroundColor: "#0C0A1A",
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  sceneTitle: {
    ...AppStyles.title,
    color: "#FFFFFF",
    textShadowColor: "rgba(96, 116, 245, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  sceneSubtitle: {
    ...AppStyles.subtitle,
    color: "#D0D0D0",
  },
  starImage: {
    width: 80,
    height: 80,
    alignSelf: "center",
    marginTop: 6,
    marginBottom: 15,
  },
  quoteText: {
    ...AppStyles.quote,
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 24,
    alignSelf: "stretch",
    flexShrink: 1,
    flexWrap: "wrap",
    marginTop: 12,
  },
  authorText: {
    ...AppStyles.author,
    color: "#D0D0D0",
  },
  quoteCard: {
    backgroundColor: "rgba(12, 10, 26, 0.6)",
    borderRadius: 20,
    paddingVertical: 44,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 15,
    marginTop: 12,
    alignItems: "center",
    alignSelf: "stretch",
    minHeight: 220,
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  favoriteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 10,
  },
  reportButton: {
    position: "absolute",
    top: 12,
    left: 12,
    padding: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  reportText: {
    color: "#9B9B9B",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    backgroundColor: "rgba(12, 10, 26, 0.6)",
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  navText: {
    ...AppStyles.navText,
    color: "#FFFFFF",
  },
});
