// components/screens/IndexScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  ScrollView,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../supabaseClient";
import { allCategories, legacyCategoryMap, quotes as bundledQuotes } from "../../data/data";
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
import { shareQuote } from '../../utils/shareQuote';
import NotificationPrompt from '../NotificationPrompt';
import { recordVisit, streakLabel, type Streak } from '../../utils/streak';
import { currentSlotKey, getSlotHours } from '../../utils/schedule';


interface Quote {
  id: string;
  text: string;
  author: string;
  category: string;
}

// Offline fallback. The full quote set ships in the bundle anyway, so use it
// rather than a handful of hardcoded lines — a user with no connection gets a
// real quote instead of the same three on repeat.
const FALLBACK_QUOTES: Quote[] = bundledQuotes.length > 0
  ? bundledQuotes
  : [{ id: "f1", text: "Keep going. You’re closer than you think.", author: "Unknown", category: "Good Vibes" }];

export default function IndexScreen() {
  const router = useRouter();
  const { userId } = useSupabase();

  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [slotCount, setSlotCount] = useState(1);

  // Cached pool of quotes for the current topic selection, so tapping
  // "Another quote" doesn't re-query Supabase on every press.
  const poolRef = useRef<Quote[]>([]);
  const poolKeyRef = useRef<string>("");

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

  /**
   * Quotes matching the user's selected topics. Cached per topic selection —
   * the key changes when topics change, so edits on /topics take effect.
   */
  const fetchPool = useCallback(async (): Promise<Quote[]> => {
    const storedTopics = await AsyncStorage.getItem("selectedTopics");
    const selectedTopics: string[] = storedTopics ? JSON.parse(storedTopics) : allCategories;

    // Migrate renamed topics and drop any that no longer exist, otherwise a
    // stale saved selection queries for categories with no rows.
    const normalised = selectedTopics
      .map((t) => legacyCategoryMap[t] ?? t)
      .filter((t) => allCategories.includes(t));

    const topics = normalised.length > 0 ? normalised : allCategories;
    const key = JSON.stringify([...topics].sort());

    if (key === poolKeyRef.current && poolRef.current.length > 0) {
      return poolRef.current;
    }

    const { data, error } = await supabase
      .schema('quotes')
      .from("approved_quotes")
      .select("id, text, author, category")
      .in("category", topics);

    if (!error && data && data.length > 0) {
      poolRef.current = data as Quote[];
      poolKeyRef.current = key;
    }
    return poolRef.current;
  }, []);

  const getQuoteOfTheDay = useCallback(async () => {
    setIsLoading(true);

    // Keyed to the notification slot, not the calendar day. Caching per day
    // meant someone on several notifications a day got several nudges all
    // pointing at the same quote — so each one now brings a fresh one, while
    // staying put between them.
    const today = await currentSlotKey();

    try {
      // 1) Use the cached quote if we are still in the same slot
      const storedQuoteData = await AsyncStorage.getItem("quoteOfTheDay");
      if (storedQuoteData) {
        const { quote, date } = JSON.parse(storedQuoteData);
        if (date === today) {
          setCurrentQuote(quote);
          return;
        }
      }

      // 2) Pull the pool for the selected topics
      const pool = await fetchPool();

      // 3) Fallback if network/table empty
      const newQuote: Quote =
        pool.length > 0
          ? pool[Math.floor(Math.random() * pool.length)]
          : pickFallback();

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
  }, [fetchPool]);

  // --- Browse a different quote without disturbing the saved quote of the day
  const handleAnotherQuote = async () => {
    if (isShuffling) return;
    setIsShuffling(true);
    try {
      const pool = await fetchPool();
      // Avoid handing back the quote already on screen
      const candidates =
        currentQuote && pool.length > 1
          ? pool.filter((q) => q.id !== currentQuote.id)
          : pool;

      setCurrentQuote(
        candidates.length > 0
          ? candidates[Math.floor(Math.random() * candidates.length)]
          : pickFallback()
      );
    } catch {
      setCurrentQuote(pickFallback());
    } finally {
      setIsShuffling(false);
    }
  };

  // Count today's visit once, on mount
  useEffect(() => {
    recordVisit().then(setStreak).catch(() => {});
    getSlotHours().then((h) => setSlotCount(h.length)).catch(() => {});
  }, []);

  // A new quote is a new report target
  useEffect(() => {
    setHasReported(false);
  }, [currentQuote?.id]);

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
    // Logged-out visitors still see the heart — send them somewhere useful
    // rather than hiding the action or dead-ending them in an alert.
    if (!userId) {
      router.push("/auth");
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

  // --- Share the quote as a branded image (open to logged-out visitors too)
  const handleShare = async () => {
    if (!currentQuote || isSharing) return;
    setIsSharing(true);
    try {
      await shareQuote(currentQuote);
    } finally {
      setIsSharing(false);
    }
  };

  // --- Simple UGC “Report” action (stores a report row)
  const handleReport = async () => {
    if (!currentQuote?.id || hasReported) return;
    try {
      await supabase.schema('quotes').from("quote_reports").insert({
        quote_id: currentQuote.id,
        reason: "inappropriate",
        reported_by_user_id: userId ?? null,
      });
      setHasReported(true);
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
        <View
          style={[
            AppStyles.header,
            {
              backgroundColor: "#0C0A1A",
              paddingHorizontal: Platform.OS === "web" ? 16 : 0,
              marginHorizontal: 0,
              alignSelf: "stretch",
              paddingTop: Platform.OS === "web" ? 80 : undefined,
            },
          ]}
        >
          <Text style={styles.sceneTitle}>Spark Quotes</Text>
          <Text style={styles.sceneSubtitle}>
            {slotCount > 1 ? "Your quote right now" : "Your Quote of the Day"}
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/search")}
            style={styles.searchButton}
            accessibilityRole="button"
            accessibilityLabel="Search quotes"
          >
            <Ionicons name="search" color="#FFFFFF" size={22} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContentContainer} alwaysBounceVertical={false}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : currentQuote ? (
            <>
              <Image
                source={require("../../assets/images/star-icon.png")}
                style={styles.starImage}
              />

              {streak && streak.current > 1 ? (
                <View style={styles.streakPill}>
                  <Ionicons name="flame" color="#FFB020" size={15} />
                  <Text style={styles.streakText}>{streakLabel(streak)}</Text>
                </View>
              ) : null}
              <Animated.View style={[styles.quoteCard, cardAnimatedStyle]}>
                {/* Category badge */}
                <View style={[AppStyles.categoryBadge, { backgroundColor: "#e63946" }]}>
                  <Text style={AppStyles.categoryText}>{currentQuote.category}</Text>
                </View>

                {/* Favorite — always visible; tapping while logged out goes to sign-in */}
                <TouchableOpacity
                  onPress={handleFavoriteToggle}
                  style={styles.favoriteButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    !userId
                      ? "Sign in to save this quote"
                      : isFavorited
                        ? "Remove from favorites"
                        : "Save to favorites"
                  }
                >
                  <Ionicons
                    name={isFavorited ? "heart" : "heart-outline"}
                    size={30}
                    color={isFavorited ? "#E74C3C" : "#9B9B9B"}
                  />
                </TouchableOpacity>

                <Text style={styles.quoteText}>"{currentQuote.text}"</Text>
                <Text style={styles.authorText}>- {currentQuote.author}</Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={handleAnotherQuote}
                    disabled={isShuffling}
                    style={[styles.secondaryButton, isShuffling && styles.buttonDisabled]}
                    accessibilityRole="button"
                    accessibilityLabel="Show another quote"
                  >
                    <Ionicons name="shuffle" color="#C9CCE3" size={18} />
                    <Text style={styles.secondaryButtonText}>
                      {isShuffling ? "Finding…" : "Another quote"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleShare}
                    disabled={isSharing}
                    style={[styles.shareButton, isSharing && styles.buttonDisabled]}
                    accessibilityRole="button"
                    accessibilityLabel="Share this quote"
                  >
                    <Ionicons name="share-social" color="#DDE1FF" size={18} />
                    <Text style={styles.shareButtonText}>
                      {isSharing ? "Preparing…" : "Share"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleReport}
                  disabled={hasReported}
                  style={styles.reportButton}
                  accessibilityRole="button"
                  accessibilityLabel="Report this quote as inappropriate"
                >
                  <Ionicons
                    name="flag-outline"
                    size={13}
                    color={hasReported ? "#6E6E7A" : "#9B9B9B"}
                  />
                  <Text style={styles.reportText}>
                    {hasReported ? "Reported" : "Report"}
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              <NotificationPrompt userId={userId} />
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
    paddingHorizontal: Platform.OS === "web" ? 16 : 0,
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
  // The quote is the reason the screen exists, so it carries the visual
  // weight — the controls below are deliberately quieter.
  quoteText: {
    ...AppStyles.quote,
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 27,
    lineHeight: 40,
    alignSelf: "stretch",
    flexShrink: 1,
    flexWrap: "wrap",
    marginTop: 20,
    marginBottom: 0,
  },
  authorText: {
    ...AppStyles.author,
    color: "#C9CCE3",
    fontSize: 16,
    // Centred under the quote rather than floating off to the right, so the
    // two read as one block
    alignSelf: "center",
    textAlign: "center",
    marginTop: 18,
  },
  quoteCard: {
    backgroundColor: "rgba(12, 10, 26, 0.6)",
    borderRadius: 20,
    paddingVertical: 44,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: Platform.OS === "web" ? 15 : 0,
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
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 7,
    marginBottom: 12,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255, 176, 32, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 176, 32, 0.3)",
  },
  streakText: { color: "#FFD08A", fontWeight: "700", fontSize: 13 },
  searchButton: {
    position: "absolute",
    right: 16,
    top: Platform.OS === "web" ? 78 : 4,
    padding: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    // Extra separation so the controls sit apart from the quote instead of
    // competing with it
    marginTop: 34,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  secondaryButtonText: {
    color: "#C9CCE3",
    fontWeight: "600",
    fontSize: 14,
  },
  // Still the primary action — the only tinted control on the card — but a
  // soft brand wash rather than a solid block that outshouts the quote.
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "rgba(102, 114, 231, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(102, 114, 231, 0.6)",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  shareButtonText: {
    color: "#DDE1FF",
    fontWeight: "700",
    fontSize: 14,
  },
  // Sits under the action row. Kept low-contrast so it never competes with
  // Share — the top-left slot is taken by the category badge.
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 14,
    opacity: 0.75,
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
